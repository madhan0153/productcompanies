export interface Company {
  id: string;
  slug: string;
  name: string;
  careers_url: string;
  logo_url: string | null;
  hubs: string[];
}
