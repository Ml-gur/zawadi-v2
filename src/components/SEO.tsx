import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://techsari.online';
const OG_IMAGE = 'https://techsari.online/og-image.png';
const TWITTER_HANDLE = '@techsari';

interface SEOMeta {
  title: string;
  description: string;
  ogDescription?: string;
  ogTitle?: string;
  path: string;
  image?: string;
  keywords?: string;
  locale?: string;
  schema?: object | object[];
  children?: React.ReactNode;
}

export function SEO({ title, description, ogDescription, ogTitle, path, image = OG_IMAGE, keywords, locale = 'en_US', schema, children }: SEOMeta) {
  const fullUrl = `${SITE_URL}${path}`;
  const ogDesc = ogDescription || description;

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={fullUrl} />

      <meta property="og:type" content="website" />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={ogDesc} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={ogTitle || title} />
      <meta property="og:site_name" content="Zawadi" />
      <meta property="og:locale" content={locale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || title} />
      <meta name="twitter:description" content={ogDesc} />
      <meta name="twitter:image" content={image} />
      <meta name="twitter:image:alt" content={ogTitle || title} />
      <meta name="twitter:site" content={TWITTER_HANDLE} />
      <meta name="twitter:creator" content={TWITTER_HANDLE} />

      {schema && (
        <script type="application/ld+json">{JSON.stringify(schema)}</script>
      )}

      {children}
    </Helmet>
  );
}
