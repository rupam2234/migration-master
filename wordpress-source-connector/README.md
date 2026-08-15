# Migration Master Connector

This folder contains the WordPress source connector plugin used to connect a source WordPress site to Migration Master.

## What it does

- Registers a small admin settings screen under Settings.
- Lets the site owner paste the connector token generated in Migration Master.
- Calls the app handshake endpoint to mark the migration row as connected.
- Exposes authenticated REST endpoints for exporting posts, pages, media, and terms.

## Auth

The plugin expects the Migration Master app to generate a connector token for the project.
The same token is:

- sent once from the WordPress admin to the app to create the connection
- stored in the plugin settings
- required in the `X-Migration-Master-Token` header for export requests

## REST endpoints

- `GET /wp-json/migration-master/v1/ping`
- `GET /wp-json/migration-master/v1/site-info`
- `GET /wp-json/migration-master/v1/posts`
- `GET /wp-json/migration-master/v1/pages`
- `GET /wp-json/migration-master/v1/media`
- `GET /wp-json/migration-master/v1/terms`
