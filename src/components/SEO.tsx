import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://www.techsari.online';
const OG_IMAGE = 'https://www.techsari.online/og-image.png';
const TWITTER_HANDLE = '@techsari';

interface SEOMeta {
  title: string;
  description: string;
  path: string;
  image?: string;
  schema?: object | object[];
}

export function SEO({ title, description, path, image = OG_IMAGE, schema }: SEOMeta) {
  const fullUrl = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={fullUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="Techsari Zawadi" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:site" content={TWITTER_HANDLE} />

      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}
    </Helmet>
  );
}
