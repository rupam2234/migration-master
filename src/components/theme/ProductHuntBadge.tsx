import Image from 'next/image';

export default function ProductHuntBadge() {
  return (
    <a
      href="https://www.producthunt.com/products/migration-master?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-migration-master"
      target="_blank"
      rel="noopener noreferrer"
      className="hidden md:block"
    >
      <Image
        alt="Migration Master - Move your Shopify store to WordPress without the mess | Product Hunt"
        width={250}
        height={54}
        src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1203425&theme=light&t=1785046874803"
      />
    </a>
  );
}
