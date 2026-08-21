<?php
/**
 * Plugin Name: Migration Master Connector
 * Description: Connects a WordPress source site to Migration Master and exposes authenticated export endpoints.
 * Version: 0.1.0
 * Author: Migration Master
 * Text Domain: migration-master-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MMC_VERSION', '0.1.0');
define('MMC_OPTION_KEY', 'mmc_connector_settings');
define('MMC_REST_NAMESPACE', 'migration-master/v1');

function mmc_default_settings() {
    $install_config = mmc_read_install_config();

    return array(
        'app_url' => !empty($install_config['app_url']) ? mmc_normalize_url($install_config['app_url']) : 'https://migrationmaster.online',
        'connection_token' => !empty($install_config['connection_token']) ? sanitize_text_field($install_config['connection_token']) : '',
        'connection_state' => 'DISCONNECTED',
        'project_name' => !empty($install_config['project_name']) ? sanitize_text_field($install_config['project_name']) : '',
        'site_name' => get_bloginfo('name'),
        'site_url' => home_url('/'),
        'rest_url' => rest_url(),
        'admin_url' => admin_url(),
        'wp_version' => get_bloginfo('version'),
        'plugin_version' => MMC_VERSION,
        'last_error' => '',
        'connected_at' => '',
    );
}

function mmc_get_settings() {
    return wp_parse_args(get_option(MMC_OPTION_KEY, array()), mmc_default_settings());
}

function mmc_update_settings(array $updates) {
    update_option(MMC_OPTION_KEY, array_merge(mmc_get_settings(), $updates));
}

function mmc_install_config_path() {
    return trailingslashit(plugin_dir_path(__FILE__)) . 'mmc-config.json';
}

function mmc_read_install_config() {
    $path = mmc_install_config_path();

    if (!file_exists($path)) {
        return array();
    }

    $raw = file_get_contents($path);
    $decoded = json_decode($raw, true);

    return is_array($decoded) ? $decoded : array();
}

function mmc_attempt_connect(array $settings) {
    $app_url = mmc_normalize_url($settings['app_url'] ?? '');
    $token = trim((string) ($settings['connection_token'] ?? ''));

    if (empty($app_url) || empty($token)) {
        return new WP_Error('mmc_missing_fields', 'App URL and connection token are required.');
    }

    $payload = array(
        'token' => $token,
        'site_url' => home_url('/'),
        'site_name' => get_bloginfo('name'),
        'rest_url' => rest_url(),
        'admin_url' => admin_url(),
        'wp_version' => get_bloginfo('version'),
        'plugin_version' => MMC_VERSION,
    );

    $response = wp_remote_post(
        trailingslashit($app_url) . 'api/wordpress/wordpress-connector/connect',
        array(
            'timeout' => 20,
            'headers' => array(
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ),
            'body' => wp_json_encode($payload),
        )
    );

    if (is_wp_error($response)) {
        return $response;
    }

    $status_code = wp_remote_retrieve_response_code($response);
    $body = json_decode(wp_remote_retrieve_body($response), true);

    if ($status_code < 200 || $status_code >= 300 || empty($body['project'])) {
        return new WP_Error(
            'mmc_connect_failed',
            $body['message'] ?? 'Unable to connect to Migration Master.'
        );
    }

    mmc_update_settings(array(
        'connection_state' => 'CONNECTED',
        'project_name' => $body['project']['project_name'] ?? '',
        'site_name' => get_bloginfo('name'),
        'site_url' => home_url('/'),
        'connected_at' => current_time('mysql'),
        'last_error' => '',
    ));

    return $body;
}

function mmc_admin_menu() {
    add_options_page(
        'Migration Master Connector',
        'Migration Master Connector',
        'manage_options',
        'migration-master-connector',
        'mmc_render_settings_page'
    );
}
add_action('admin_menu', 'mmc_admin_menu');

function mmc_admin_init() {
    add_action('admin_post_mmc_save_settings', 'mmc_handle_save_settings');
    add_action('admin_post_mmc_connect', 'mmc_handle_connect');
    add_action('admin_post_mmc_disconnect', 'mmc_handle_disconnect');
    add_action('rest_api_init', 'mmc_register_routes');
}
add_action('admin_init', 'mmc_admin_init');
add_action('admin_init', 'mmc_maybe_bootstrap_connection');

function mmc_maybe_bootstrap_connection() {
    if (!is_admin()) {
        return;
    }

    global $pagenow;
    $page = $_GET['page'] ?? '';

    if ($pagenow !== 'options-general.php' || $page !== 'migration-master-connector') {
        return;
    }

    $install_config = mmc_read_install_config();

    if (empty($install_config['auto_connect']) || empty($install_config['connection_token']) || empty($install_config['app_url'])) {
        return;
    }

    $settings = mmc_get_settings();

    if (!empty($settings['connection_state']) && $settings['connection_state'] === 'CONNECTED') {
        return;
    }

    $merged_settings = array_merge(
        $settings,
        array(
            'app_url' => mmc_normalize_url($install_config['app_url']),
            'connection_token' => sanitize_text_field($install_config['connection_token']),
            'project_name' => sanitize_text_field($install_config['project_name'] ?? ''),
        )
    );

    mmc_update_settings($merged_settings);
    $result = mmc_attempt_connect(mmc_get_settings());

    if (is_wp_error($result)) {
        mmc_update_settings(array(
            'connection_state' => 'DISCONNECTED',
            'last_error' => $result->get_error_message(),
        ));
    }
}

function mmc_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }

    $settings = mmc_get_settings();
    $connected = $settings['connection_state'] === 'CONNECTED';
    ?>
    <div class="wrap">
        <h1>Migration Master Connector</h1>
        <p>Connect this WordPress source site to Migration Master and expose authenticated export endpoints.</p>

        <div style="margin: 16px 0; padding: 12px 16px; background: #fff; border: 1px solid #dcdcde; border-radius: 6px;">
            <strong>Status:</strong>
            <?php if ($connected) : ?>
                <span style="color: #0a7a2f;">Connected</span>
            <?php elseif ($settings['connection_state'] === 'PENDING_CONNECTOR') : ?>
                <span style="color: #b45309;">Waiting for app connection</span>
            <?php else : ?>
                <span style="color: #666;">Not connected</span>
            <?php endif; ?>
            <div style="margin-top: 6px; color: #555;">
                Site: <code><?php echo esc_html($settings['site_url']); ?></code>
            </div>
        </div>

        <?php if (!empty($settings['last_error'])) : ?>
            <div style="margin: 16px 0; padding: 12px 16px; background: #fff0f0; border: 1px solid #f1b4b4; border-radius: 6px; color: #9b1c1c;">
                <?php echo esc_html($settings['last_error']); ?>
            </div>
        <?php endif; ?>

        <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" style="max-width: 760px;">
            <?php wp_nonce_field('mmc_save_settings'); ?>
            <input type="hidden" name="action" value="mmc_save_settings" />

            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="app_url">Migration Master App URL</label></th>
                    <td>
                        <input name="app_url" id="app_url" type="url" class="regular-text" value="<?php echo esc_attr($settings['app_url']); ?>" />
                        <p class="description">The URL of your Migration Master app, for example <code>https://migrationmaster.online</code>.</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><label for="connection_token">Connection Token</label></th>
                    <td>
                        <input name="connection_token" id="connection_token" type="text" class="regular-text" value="<?php echo esc_attr($settings['connection_token']); ?>" />
                        <p class="description">Paste the connector token generated from the app dashboard.</p>
                    </td>
                </tr>
            </table>

            <p class="submit">
                <button type="submit" class="button button-secondary">Save Settings</button>
                <button type="submit" class="button button-primary" name="mmc_action" value="connect">Connect to App</button>
            </p>
        </form>

        <?php if ($connected) : ?>
            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
                <?php wp_nonce_field('mmc_disconnect'); ?>
                <input type="hidden" name="action" value="mmc_disconnect" />
                <p class="submit">
                    <button type="submit" class="button">Disconnect</button>
                </p>
            </form>
        <?php endif; ?>

        <hr />

        <h2>Authenticated endpoints</h2>
        <ul>
            <li><code>/wp-json/<?php echo esc_html(MMC_REST_NAMESPACE); ?>/ping</code></li>
            <li><code>/wp-json/<?php echo esc_html(MMC_REST_NAMESPACE); ?>/site-info</code></li>
            <li><code>/wp-json/<?php echo esc_html(MMC_REST_NAMESPACE); ?>/posts</code></li>
            <li><code>/wp-json/<?php echo esc_html(MMC_REST_NAMESPACE); ?>/pages</code></li>
            <li><code>/wp-json/<?php echo esc_html(MMC_REST_NAMESPACE); ?>/media</code></li>
            <li><code>/wp-json/<?php echo esc_html(MMC_REST_NAMESPACE); ?>/terms</code></li>
        </ul>
    </div>
    <?php
}

function mmc_handle_save_settings() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized', 403);
    }

    check_admin_referer('mmc_save_settings');

    $settings = mmc_get_settings();
    $settings['app_url'] = mmc_normalize_url(wp_unslash($_POST['app_url'] ?? $settings['app_url']));
    $settings['connection_token'] = sanitize_text_field(wp_unslash($_POST['connection_token'] ?? $settings['connection_token']));
    $settings['site_name'] = get_bloginfo('name');
    $settings['site_url'] = home_url('/');
    $settings['rest_url'] = rest_url();
    $settings['admin_url'] = admin_url();
    $settings['wp_version'] = get_bloginfo('version');
    $settings['plugin_version'] = MMC_VERSION;
    $settings['last_error'] = '';

    update_option(MMC_OPTION_KEY, $settings);

    if (isset($_POST['mmc_action']) && $_POST['mmc_action'] === 'connect') {
        mmc_handle_connect();
        return;
    }

    wp_safe_redirect(admin_url('options-general.php?page=migration-master-connector&updated=1'));
    exit;
}

function mmc_handle_connect() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized', 403);
    }

    check_admin_referer('mmc_save_settings');

    $result = mmc_attempt_connect(mmc_get_settings());

    if (is_wp_error($result)) {
        mmc_update_settings(array(
            'connection_state' => 'DISCONNECTED',
            'last_error' => $result->get_error_message(),
        ));
        wp_safe_redirect(admin_url('options-general.php?page=migration-master-connector&error=request_failed'));
        exit;
    }

    wp_safe_redirect(admin_url('options-general.php?page=migration-master-connector&connected=1'));
    exit;
}

function mmc_handle_disconnect() {
    if (!current_user_can('manage_options')) {
        wp_die('Unauthorized', 403);
    }

    check_admin_referer('mmc_disconnect');

    mmc_update_settings(array(
        'connection_state' => 'DISCONNECTED',
        'project_name' => '',
        'connected_at' => '',
        'last_error' => '',
    ));

    wp_safe_redirect(admin_url('options-general.php?page=migration-master-connector&disconnected=1'));
    exit;
}

function mmc_register_routes() {
    register_rest_route(
        MMC_REST_NAMESPACE,
        '/ping',
        array(
            'methods' => 'GET',
            'callback' => 'mmc_rest_ping',
            'permission_callback' => 'mmc_rest_permission_check',
        )
    );

    register_rest_route(
        MMC_REST_NAMESPACE,
        '/site-info',
        array(
            'methods' => 'GET',
            'callback' => 'mmc_rest_site_info',
            'permission_callback' => 'mmc_rest_permission_check',
        )
    );

    register_rest_route(
        MMC_REST_NAMESPACE,
        '/posts',
        array(
            'methods' => 'GET',
            'callback' => 'mmc_rest_posts',
            'permission_callback' => 'mmc_rest_permission_check',
        )
    );

    register_rest_route(
        MMC_REST_NAMESPACE,
        '/pages',
        array(
            'methods' => 'GET',
            'callback' => 'mmc_rest_pages',
            'permission_callback' => 'mmc_rest_permission_check',
        )
    );

    register_rest_route(
        MMC_REST_NAMESPACE,
        '/media',
        array(
            'methods' => 'GET',
            'callback' => 'mmc_rest_media',
            'permission_callback' => 'mmc_rest_permission_check',
        )
    );

    register_rest_route(
        MMC_REST_NAMESPACE,
        '/terms',
        array(
            'methods' => 'GET',
            'callback' => 'mmc_rest_terms',
            'permission_callback' => 'mmc_rest_permission_check',
        )
    );
}

function mmc_rest_permission_check(WP_REST_Request $request) {
    $settings = mmc_get_settings();
    $token = mmc_extract_request_token($request);

    if (empty($settings['connection_token']) || empty($token)) {
        return new WP_Error('mmc_forbidden', 'Missing connector token.', array('status' => 403));
    }

    if (!hash_equals($settings['connection_token'], $token)) {
        return new WP_Error('mmc_forbidden', 'Invalid connector token.', array('status' => 403));
    }

    return true;
}

function mmc_rest_ping() {
    $settings = mmc_get_settings();

    return rest_ensure_response(array(
        'ok' => true,
        'site' => array(
            'name' => $settings['site_name'],
            'url' => $settings['site_url'],
            'rest_url' => $settings['rest_url'],
            'admin_url' => $settings['admin_url'],
            'wp_version' => $settings['wp_version'],
            'plugin_version' => $settings['plugin_version'],
            'connection_state' => $settings['connection_state'],
            'project_name' => $settings['project_name'],
        ),
    ));
}

function mmc_rest_site_info() {
    $settings = mmc_get_settings();

    return rest_ensure_response(array(
        'name' => $settings['site_name'],
        'url' => $settings['site_url'],
        'rest_url' => $settings['rest_url'],
        'admin_url' => $settings['admin_url'],
        'wp_version' => $settings['wp_version'],
        'plugin_version' => $settings['plugin_version'],
        'timezone' => wp_timezone_string(),
        'locale' => determine_locale(),
        'connection_state' => $settings['connection_state'],
        'project_name' => $settings['project_name'],
    ));
}

function mmc_rest_posts(WP_REST_Request $request) {
    $post_type = sanitize_key($request->get_param('post_type') ?: 'post');
    $paged = max(1, absint($request->get_param('page') ?: 1));
    $per_page = min(100, max(1, absint($request->get_param('per_page') ?: 50)));

    $query = new WP_Query(array(
        'post_type' => $post_type,
        'post_status' => array('publish', 'future', 'draft', 'pending', 'private'),
        'posts_per_page' => $per_page,
        'paged' => $paged,
        'orderby' => 'ID',
        'order' => 'ASC',
        'ignore_sticky_posts' => true,
        'no_found_rows' => false,
    ));

    $items = array();

    foreach ($query->posts as $post) {
        $items[] = mmc_format_post($post);
    }

    return rest_ensure_response(array(
        'items' => $items,
        'pagination' => array(
            'page' => $paged,
            'per_page' => $per_page,
            'total' => (int) $query->found_posts,
            'total_pages' => (int) $query->max_num_pages,
        ),
    ));
}

function mmc_rest_pages(WP_REST_Request $request) {
    $request->set_param('post_type', 'page');
    return mmc_rest_posts($request);
}

function mmc_rest_media(WP_REST_Request $request) {
    $paged = max(1, absint($request->get_param('page') ?: 1));
    $per_page = min(100, max(1, absint($request->get_param('per_page') ?: 50)));

    $query = new WP_Query(array(
        'post_type' => 'attachment',
        'post_status' => 'inherit',
        'posts_per_page' => $per_page,
        'paged' => $paged,
        'orderby' => 'ID',
        'order' => 'ASC',
        'post_mime_type' => 'image',
        'ignore_sticky_posts' => true,
        'no_found_rows' => false,
    ));

    $items = array();

    foreach ($query->posts as $post) {
        $items[] = mmc_format_attachment($post);
    }

    return rest_ensure_response(array(
        'items' => $items,
        'pagination' => array(
            'page' => $paged,
            'per_page' => $per_page,
            'total' => (int) $query->found_posts,
            'total_pages' => (int) $query->max_num_pages,
        ),
    ));
}

function mmc_rest_terms(WP_REST_Request $request) {
    $taxonomy = sanitize_key($request->get_param('taxonomy') ?: 'category');
    $per_page = min(200, max(1, absint($request->get_param('per_page') ?: 100)));
    $paged = max(1, absint($request->get_param('page') ?: 1));

    $terms = get_terms(array(
        'taxonomy' => $taxonomy,
        'hide_empty' => false,
        'number' => $per_page,
        'offset' => ($paged - 1) * $per_page,
        'orderby' => 'term_id',
        'order' => 'ASC',
    ));

    if (is_wp_error($terms)) {
        return new WP_Error('mmc_terms_error', $terms->get_error_message(), array('status' => 500));
    }

    $items = array();

    foreach ($terms as $term) {
        $items[] = array(
            'id' => $term->term_id,
            'taxonomy' => $term->taxonomy,
            'name' => $term->name,
            'slug' => $term->slug,
            'description' => $term->description,
            'parent' => (int) $term->parent,
            'count' => (int) $term->count,
        );
    }

    return rest_ensure_response(array(
        'items' => $items,
        'pagination' => array(
            'page' => $paged,
            'per_page' => $per_page,
            'total' => count(get_terms(array(
                'taxonomy' => $taxonomy,
                'hide_empty' => false,
                'fields' => 'ids',
            ))),
        ),
    ));
}

function mmc_format_post(WP_Post $post) {
    $taxonomies = get_object_taxonomies($post->post_type, 'names');
    $terms = array();

    foreach ($taxonomies as $taxonomy) {
        $taxonomy_terms = wp_get_post_terms($post->ID, $taxonomy, array('fields' => 'all'));
        $terms[$taxonomy] = array_map(function ($term) {
            return array(
                'id' => $term->term_id,
                'taxonomy' => $term->taxonomy,
                'name' => $term->name,
                'slug' => $term->slug,
            );
        }, $taxonomy_terms);
    }

    return array(
        'id' => $post->ID,
        'type' => $post->post_type,
        'status' => $post->post_status,
        'title' => get_the_title($post),
        'slug' => $post->post_name,
        'content' => apply_filters('the_content', $post->post_content),
        'excerpt' => get_the_excerpt($post),
        'date_gmt' => get_post_time('c', true, $post),
        'modified_gmt' => get_post_modified_time('c', true, $post),
        'author' => array(
            'id' => (int) $post->post_author,
            'name' => get_the_author_meta('display_name', $post->post_author),
        ),
        'permalink' => get_permalink($post),
        'featured_image' => get_the_post_thumbnail_url($post, 'full'),
        'meta' => get_post_meta($post->ID),
        'terms' => $terms,
    );
}

function mmc_format_attachment(WP_Post $post) {
    return array(
        'id' => $post->ID,
        'title' => get_the_title($post),
        'slug' => $post->post_name,
        'status' => $post->post_status,
        'mime_type' => get_post_mime_type($post),
        'url' => wp_get_attachment_url($post->ID),
        'alt' => get_post_meta($post->ID, '_wp_attachment_image_alt', true),
        'caption' => $post->post_excerpt,
        'description' => $post->post_content,
        'metadata' => wp_get_attachment_metadata($post->ID),
    );
}

function mmc_extract_request_token(WP_REST_Request $request) {
    $header_token = $request->get_header('x-migration-master-token');
    if (!empty($header_token)) {
        return trim($header_token);
    }

    $auth = $request->get_header('authorization');
    if (!empty($auth) && stripos($auth, 'Bearer ') === 0) {
        return trim(substr($auth, 7));
    }

    $query_token = $request->get_param('token');
    if (!empty($query_token)) {
        return trim($query_token);
    }

    return '';
}

function mmc_normalize_url($value) {
    $value = trim((string) $value);
    if (empty($value)) {
        return '';
    }

    $value = preg_replace('#^https?://#i', 'https://', $value);

    return untrailingslashit($value);
}
