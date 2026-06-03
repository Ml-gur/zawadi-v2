// src/lib/country-graph.ts
// Single source of truth for all country-to-region relationships.
// Uses UN Geoscheme as base, overlaid with AU RECs, Commonwealth, OIF, CPLP.
// No label-based "Other" categories anywhere in this file.

export interface CountryNode {
  name: string;
  iso2: string;
  iso3: string;
  un_region: string;
  un_subregion: string;
  au_rec: string | null;
  is_commonwealth: boolean;
  is_francophone: boolean;
  is_lusophone: boolean;
  is_african: boolean;
  is_ldc: boolean;
}

export const COUNTRY_GRAPH: CountryNode[] = [
  // ========================
  // AFRICA
  // ========================

  // --- Northern Africa ---
  { name: 'Algeria', iso2: 'DZ', iso3: 'DZA', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: 'AMU', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Egypt', iso2: 'EG', iso3: 'EGY', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: 'COMESA', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Libya', iso2: 'LY', iso3: 'LBY', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: 'AMU', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Morocco', iso2: 'MA', iso3: 'MAR', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: 'AMU', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Sudan', iso2: 'SD', iso3: 'SDN', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: 'IGAD', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Tunisia', iso2: 'TN', iso3: 'TUN', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: 'AMU', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Western Sahara', iso2: 'EH', iso3: 'ESH', un_region: 'Africa', un_subregion: 'Northern Africa', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },

  // --- Eastern Africa ---
  { name: 'Burundi', iso2: 'BI', iso3: 'BDI', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'EAC', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Comoros', iso2: 'KM', iso3: 'COM', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Djibouti', iso2: 'DJ', iso3: 'DJI', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'IGAD', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Eritrea', iso2: 'ER', iso3: 'ERI', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'IGAD', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Ethiopia', iso2: 'ET', iso3: 'ETH', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'IGAD', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Kenya', iso2: 'KE', iso3: 'KEN', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'EAC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Madagascar', iso2: 'MG', iso3: 'MDG', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Malawi', iso2: 'MW', iso3: 'MWI', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Mauritius', iso2: 'MU', iso3: 'MUS', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Mozambique', iso2: 'MZ', iso3: 'MOZ', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: true, is_african: true, is_ldc: true },
  { name: 'Rwanda', iso2: 'RW', iso3: 'RWA', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'EAC', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Seychelles', iso2: 'SC', iso3: 'SYC', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Somalia', iso2: 'SO', iso3: 'SOM', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'IGAD', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'South Sudan', iso2: 'SS', iso3: 'SSD', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'EAC', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Tanzania', iso2: 'TZ', iso3: 'TZA', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'EAC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Uganda', iso2: 'UG', iso3: 'UGA', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'EAC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Zambia', iso2: 'ZM', iso3: 'ZMB', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Zimbabwe', iso2: 'ZW', iso3: 'ZWE', un_region: 'Africa', un_subregion: 'Eastern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },

  // --- Middle Africa ---
  { name: 'Angola', iso2: 'AO', iso3: 'AGO', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'SADC', is_commonwealth: false, is_francophone: false, is_lusophone: true, is_african: true, is_ldc: true },
  { name: 'Cameroon', iso2: 'CM', iso3: 'CMR', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Central African Republic', iso2: 'CF', iso3: 'CAF', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Chad', iso2: 'TD', iso3: 'TCD', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Congo', iso2: 'CG', iso3: 'COG', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Democratic Republic of the Congo', iso2: 'CD', iso3: 'COD', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Equatorial Guinea', iso2: 'GQ', iso3: 'GNQ', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: false, is_francophone: true, is_lusophone: true, is_african: true, is_ldc: false },
  { name: 'Gabon', iso2: 'GA', iso3: 'GAB', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'São Tomé and Príncipe', iso2: 'ST', iso3: 'STP', un_region: 'Africa', un_subregion: 'Middle Africa', au_rec: 'ECCAS', is_commonwealth: false, is_francophone: true, is_lusophone: true, is_african: true, is_ldc: true },

  // --- Southern Africa ---
  { name: 'Botswana', iso2: 'BW', iso3: 'BWA', un_region: 'Africa', un_subregion: 'Southern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Eswatini', iso2: 'SZ', iso3: 'SWZ', un_region: 'Africa', un_subregion: 'Southern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Lesotho', iso2: 'LS', iso3: 'LSO', un_region: 'Africa', un_subregion: 'Southern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Namibia', iso2: 'NA', iso3: 'NAM', un_region: 'Africa', un_subregion: 'Southern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'South Africa', iso2: 'ZA', iso3: 'ZAF', un_region: 'Africa', un_subregion: 'Southern Africa', au_rec: 'SADC', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },

  // --- Western Africa ---
  { name: 'Benin', iso2: 'BJ', iso3: 'BEN', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Burkina Faso', iso2: 'BF', iso3: 'BFA', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Cape Verde', iso2: 'CV', iso3: 'CPV', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: false, is_lusophone: true, is_african: true, is_ldc: false },
  { name: "Côte d'Ivoire", iso2: 'CI', iso3: 'CIV', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Gambia', iso2: 'GM', iso3: 'GMB', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Ghana', iso2: 'GH', iso3: 'GHA', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Guinea', iso2: 'GN', iso3: 'GIN', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Guinea-Bissau', iso2: 'GW', iso3: 'GNB', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: true, is_african: true, is_ldc: true },
  { name: 'Liberia', iso2: 'LR', iso3: 'LBR', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Mali', iso2: 'ML', iso3: 'MLI', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Mauritania', iso2: 'MR', iso3: 'MRT', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'AMU', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Niger', iso2: 'NE', iso3: 'NER', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Nigeria', iso2: 'NG', iso3: 'NGA', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: false },
  { name: 'Senegal', iso2: 'SN', iso3: 'SEN', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Sierra Leone', iso2: 'SL', iso3: 'SLE', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: true, is_ldc: true },
  { name: 'Togo', iso2: 'TG', iso3: 'TGO', un_region: 'Africa', un_subregion: 'Western Africa', au_rec: 'ECOWAS', is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: true, is_ldc: true },

  // ========================
  // EUROPE
  // ========================

  // --- Northern Europe ---
  { name: 'United Kingdom', iso2: 'GB', iso3: 'GBR', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Ireland', iso2: 'IE', iso3: 'IRL', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Denmark', iso2: 'DK', iso3: 'DNK', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Finland', iso2: 'FI', iso3: 'FIN', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Iceland', iso2: 'IS', iso3: 'ISL', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Norway', iso2: 'NO', iso3: 'NOR', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Sweden', iso2: 'SE', iso3: 'SWE', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Estonia', iso2: 'EE', iso3: 'EST', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Latvia', iso2: 'LV', iso3: 'LVA', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Lithuania', iso2: 'LT', iso3: 'LTU', un_region: 'Europe', un_subregion: 'Northern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Western Europe ---
  { name: 'Austria', iso2: 'AT', iso3: 'AUT', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Belgium', iso2: 'BE', iso3: 'BEL', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'France', iso2: 'FR', iso3: 'FRA', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Germany', iso2: 'DE', iso3: 'DEU', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Liechtenstein', iso2: 'LI', iso3: 'LIE', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Luxembourg', iso2: 'LU', iso3: 'LUX', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Monaco', iso2: 'MC', iso3: 'MCO', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Netherlands', iso2: 'NL', iso3: 'NLD', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Switzerland', iso2: 'CH', iso3: 'CHE', un_region: 'Europe', un_subregion: 'Western Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Southern Europe ---
  { name: 'Albania', iso2: 'AL', iso3: 'ALB', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Andorra', iso2: 'AD', iso3: 'AND', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Bosnia and Herzegovina', iso2: 'BA', iso3: 'BIH', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Croatia', iso2: 'HR', iso3: 'HRV', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Greece', iso2: 'GR', iso3: 'GRC', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Italy', iso2: 'IT', iso3: 'ITA', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Malta', iso2: 'MT', iso3: 'MLT', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Montenegro', iso2: 'ME', iso3: 'MNE', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'North Macedonia', iso2: 'MK', iso3: 'MKD', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Portugal', iso2: 'PT', iso3: 'PRT', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: true, is_african: false, is_ldc: false },
  { name: 'San Marino', iso2: 'SM', iso3: 'SMR', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Serbia', iso2: 'RS', iso3: 'SRB', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Slovenia', iso2: 'SI', iso3: 'SVN', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Spain', iso2: 'ES', iso3: 'ESP', un_region: 'Europe', un_subregion: 'Southern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Eastern Europe ---
  { name: 'Armenia', iso2: 'AM', iso3: 'ARM', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Azerbaijan', iso2: 'AZ', iso3: 'AZE', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Belarus', iso2: 'BY', iso3: 'BLR', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Bulgaria', iso2: 'BG', iso3: 'BGR', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Czech Republic', iso2: 'CZ', iso3: 'CZE', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Georgia', iso2: 'GE', iso3: 'GEO', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Hungary', iso2: 'HU', iso3: 'HUN', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Moldova', iso2: 'MD', iso3: 'MDA', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Poland', iso2: 'PL', iso3: 'POL', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Romania', iso2: 'RO', iso3: 'ROU', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Russia', iso2: 'RU', iso3: 'RUS', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Slovakia', iso2: 'SK', iso3: 'SVK', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Ukraine', iso2: 'UA', iso3: 'UKR', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Cyprus', iso2: 'CY', iso3: 'CYP', un_region: 'Europe', un_subregion: 'Eastern Europe', au_rec: null, is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },

  // ========================
  // AMERICAS
  // ========================

  // --- Northern America ---
  { name: 'Canada', iso2: 'CA', iso3: 'CAN', un_region: 'Americas', un_subregion: 'Northern America', au_rec: null, is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'United States', iso2: 'US', iso3: 'USA', un_region: 'Americas', un_subregion: 'Northern America', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Latin America & Caribbean ---
  { name: 'Antigua and Barbuda', iso2: 'AG', iso3: 'ATG', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Argentina', iso2: 'AR', iso3: 'ARG', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Bahamas', iso2: 'BS', iso3: 'BHS', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Barbados', iso2: 'BB', iso3: 'BRB', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Belize', iso2: 'BZ', iso3: 'BLZ', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Brazil', iso2: 'BR', iso3: 'BRA', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: true, is_african: false, is_ldc: false },
  { name: 'Dominica', iso2: 'DM', iso3: 'DMA', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Grenada', iso2: 'GD', iso3: 'GRD', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Guyana', iso2: 'GY', iso3: 'GUY', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Haiti', iso2: 'HT', iso3: 'HTI', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Jamaica', iso2: 'JM', iso3: 'JAM', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Saint Kitts and Nevis', iso2: 'KN', iso3: 'KNA', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Saint Lucia', iso2: 'LC', iso3: 'LCA', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Saint Vincent and the Grenadines', iso2: 'VC', iso3: 'VCT', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Trinidad and Tobago', iso2: 'TT', iso3: 'TTO', un_region: 'Americas', un_subregion: 'Latin America and the Caribbean', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // ========================
  // ASIA
  // ========================

  // --- Central Asia ---
  { name: 'Kazakhstan', iso2: 'KZ', iso3: 'KAZ', un_region: 'Asia', un_subregion: 'Central Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Eastern Asia ---
  { name: 'China', iso2: 'CN', iso3: 'CHN', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Hong Kong', iso2: 'HK', iso3: 'HKG', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Japan', iso2: 'JP', iso3: 'JPN', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Macau', iso2: 'MO', iso3: 'MAC', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: true, is_african: false, is_ldc: false },
  { name: 'Mongolia', iso2: 'MN', iso3: 'MNG', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'South Korea', iso2: 'KR', iso3: 'KOR', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Taiwan', iso2: 'TW', iso3: 'TWN', un_region: 'Asia', un_subregion: 'Eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // --- South-eastern Asia ---
  { name: 'Brunei', iso2: 'BN', iso3: 'BRN', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Cambodia', iso2: 'KH', iso3: 'KHM', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Indonesia', iso2: 'ID', iso3: 'IDN', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Laos', iso2: 'LA', iso3: 'LAO', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Malaysia', iso2: 'MY', iso3: 'MYS', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Myanmar', iso2: 'MM', iso3: 'MMR', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Philippines', iso2: 'PH', iso3: 'PHL', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Singapore', iso2: 'SG', iso3: 'SGP', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Thailand', iso2: 'TH', iso3: 'THA', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Timor-Leste', iso2: 'TL', iso3: 'TLS', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: true, is_african: false, is_ldc: true },
  { name: 'Vietnam', iso2: 'VN', iso3: 'VNM', un_region: 'Asia', un_subregion: 'South-eastern Asia', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Southern Asia ---
  { name: 'Afghanistan', iso2: 'AF', iso3: 'AFG', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Bangladesh', iso2: 'BD', iso3: 'BGD', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'India', iso2: 'IN', iso3: 'IND', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Maldives', iso2: 'MV', iso3: 'MDV', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Nepal', iso2: 'NP', iso3: 'NPL', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Pakistan', iso2: 'PK', iso3: 'PAK', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Sri Lanka', iso2: 'LK', iso3: 'LKA', un_region: 'Asia', un_subregion: 'Southern Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },

  // --- Western Asia ---
  { name: 'Bahrain', iso2: 'BH', iso3: 'BHR', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Iran', iso2: 'IR', iso3: 'IRN', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Iraq', iso2: 'IQ', iso3: 'IRQ', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Israel', iso2: 'IL', iso3: 'ISR', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Jordan', iso2: 'JO', iso3: 'JOR', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Kuwait', iso2: 'KW', iso3: 'KWT', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Lebanon', iso2: 'LB', iso3: 'LBN', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Oman', iso2: 'OM', iso3: 'OMN', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Qatar', iso2: 'QA', iso3: 'QAT', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Saudi Arabia', iso2: 'SA', iso3: 'SAU', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Turkey', iso2: 'TR', iso3: 'TUR', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'United Arab Emirates', iso2: 'AE', iso3: 'ARE', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Yemen', iso2: 'YE', iso3: 'YEM', un_region: 'Asia', un_subregion: 'Western Asia', au_rec: null, is_commonwealth: false, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },

  // ========================
  // OCEANIA
  // ========================

  { name: 'Australia', iso2: 'AU', iso3: 'AUS', un_region: 'Oceania', un_subregion: 'Australia and New Zealand', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'New Zealand', iso2: 'NZ', iso3: 'NZL', un_region: 'Oceania', un_subregion: 'Australia and New Zealand', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Fiji', iso2: 'FJ', iso3: 'FJI', un_region: 'Oceania', un_subregion: 'Melanesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Kiribati', iso2: 'KI', iso3: 'KIR', un_region: 'Oceania', un_subregion: 'Micronesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Nauru', iso2: 'NR', iso3: 'NRU', un_region: 'Oceania', un_subregion: 'Micronesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Papua New Guinea', iso2: 'PG', iso3: 'PNG', un_region: 'Oceania', un_subregion: 'Melanesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Samoa', iso2: 'WS', iso3: 'WSM', un_region: 'Oceania', un_subregion: 'Polynesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Solomon Islands', iso2: 'SB', iso3: 'SLB', un_region: 'Oceania', un_subregion: 'Melanesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Tonga', iso2: 'TO', iso3: 'TON', un_region: 'Oceania', un_subregion: 'Polynesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: false },
  { name: 'Tuvalu', iso2: 'TV', iso3: 'TUV', un_region: 'Oceania', un_subregion: 'Polynesia', au_rec: null, is_commonwealth: true, is_francophone: false, is_lusophone: false, is_african: false, is_ldc: true },
  { name: 'Vanuatu', iso2: 'VU', iso3: 'VUT', un_region: 'Oceania', un_subregion: 'Melanesia', au_rec: null, is_commonwealth: true, is_francophone: true, is_lusophone: false, is_african: false, is_ldc: true },
];

// Pre-built lookup maps for fast access
const byISO2 = new Map<string, CountryNode>();
const byName = new Map<string, CountryNode>();

for (const c of COUNTRY_GRAPH) {
  byISO2.set(c.iso2.toLowerCase(), c);
  byISO2.set(c.iso2.toUpperCase(), c);
  byName.set(c.name.toLowerCase(), c);
}

export function getCountryByISO2(code: string): CountryNode | undefined {
  return byISO2.get(code.toUpperCase());
}

export function getCountryByName(name: string): CountryNode | undefined {
  return byName.get(name.toLowerCase());
}

// ========================
// RESOLVER FUNCTIONS
// ========================

export function getCountriesByAURegion(rec: string): string[] {
  return COUNTRY_GRAPH.filter(c => c.au_rec === rec && c.is_african).map(c => c.name);
}

export function getCountriesByUNSubregion(subregion: string): string[] {
  return COUNTRY_GRAPH.filter(c => c.un_subregion === subregion).map(c => c.name);
}

export function getCommonwealthCountries(): string[] {
  return COUNTRY_GRAPH.filter(c => c.is_commonwealth).map(c => c.name);
}

export function getFrancophonieCountries(): string[] {
  return COUNTRY_GRAPH.filter(c => c.is_francophone).map(c => c.name);
}

export function getCPLPCountries(): string[] {
  return COUNTRY_GRAPH.filter(c => c.is_lusophone).map(c => c.name);
}

export function getAfricanCountries(): string[] {
  return COUNTRY_GRAPH.filter(c => c.is_african).map(c => c.name);
}

export function resolveDestinationRegion(regionLabel: string): string[] {
  switch (regionLabel) {
    case 'West Africa hubs':
      return getCountriesByAURegion('ECOWAS');

    case 'East Africa hubs':
      return [
        ...getCountriesByAURegion('EAC'),
        ...getCountriesByAURegion('IGAD'),
      ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate (e.g. South Sudan, Kenya)

    case 'Southern Africa hubs':
      return getCountriesByAURegion('SADC');

    case 'North Africa hubs':
      return getCountriesByAURegion('AMU');

    case 'Central Africa hubs':
      return getCountriesByAURegion('ECCAS');

    case 'United Kingdom and Ireland':
      return ['United Kingdom', 'Ireland'];

    case 'United States and Canada':
      return ['United States', 'Canada'];

    case 'Australia and New Zealand':
      return ['Australia', 'New Zealand'];

    case 'Commonwealth countries':
      return getCommonwealthCountries();

    case 'Commonwealth Africa':
      return getCommonwealthCountries().filter(c => {
        const node = getCountryByName(c);
        return node !== undefined && node.is_african;
      });

    case 'Commonwealth Global':
      return getCommonwealthCountries().filter(c => {
        const node = getCountryByName(c);
        return node !== undefined && !node.is_african;
      });

    case 'Francophone Africa':
      return getFrancophonieCountries().filter(c => {
        const node = getCountryByName(c);
        return node !== undefined && node.is_african;
      });

    case 'Francophone destinations':
      return getFrancophonieCountries();

    case 'Lusophone destinations':
      return getCPLPCountries();

    case 'France and Belgium':
      return ['France', 'Belgium'];

    case 'Germany, Austria, Switzerland (German-speaking)':
      return ['Germany', 'Austria', 'Switzerland'];

    case 'Nordic countries: Sweden, Norway, Denmark, Finland':
      return ['Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland'];

    case 'Netherlands and Belgium':
      return ['Netherlands', 'Belgium'];

    case 'Rest of Europe': {
      const southern = getCountriesByUNSubregion('Southern Europe');
      const eastern = getCountriesByUNSubregion('Eastern Europe');
      const explicit = new Set([
        'United Kingdom', 'Ireland', 'France', 'Belgium', 'Germany', 'Austria',
        'Switzerland', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
        'Iceland', 'Portugal',
      ]);
      const rest = [...southern, ...eastern].filter(c => !explicit.has(c));
      return rest.filter((v, i, a) => a.indexOf(v) === i);
    }

    case 'China and East Asia':
      return ['China', 'Hong Kong', 'Mongolia', 'Taiwan'];

    case 'Japan and South Korea':
      return ['Japan', 'South Korea'];

    case 'Southeast Asia':
      return getCountriesByUNSubregion('South-eastern Asia');

    case 'Middle East and Gulf states':
      return ['Saudi Arabia', 'United Arab Emirates', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Turkey'];

    default:
      return [];
  }
}
