// Centralized white-label brand configuration.
// Change these values to rebrand the app for any real estate agency.
export const brandConfig = {
  brand_name: 'MatchHouse',
  brand_subtitle: 'by YONG.MX',
  powered_by_text: 'Powered by YONG.MX',
  company_name: 'YONG.MX',
  logo_url: '',
  contact_whatsapp: '',
  contact_email: '',
  advisor_whatsapp: '',
  company_whatsapp: '',
  default_whatsapp_message_template: 'Hola, soy {{client_name}}. Ya hice mi selección en MatchHouse y me gustaría agendar un recorrido. Estas son las propiedades que me interesan: {{property_titles}}. Mi presupuesto aproximado es {{budget_range}} y prefiero {{preferred_zones}}.',
  require_whatsapp_verification: true,
  demo_whatsapp_otp_enabled: true,
  demo_whatsapp_otp_code: '123456',
  tagline: 'Private real estate discovery.',
  taglines: {
    primary: 'Find the property that actually fits you.',
    secondary: 'A private real estate discovery experience that learns your lifestyle, budget and timing — then shows you homes worth seeing.',
    tertiary: 'No endless listings. Just curated matches.'
  },
  taglines_es: {
    primary: 'Encuentra una propiedad que realmente vaya contigo.',
    secondary: 'Una experiencia privada de descubrimiento inmobiliario que entiende tu estilo de vida, presupuesto y momento de compra.',
    tertiary: 'No es un portal. Es un sistema de match.'
  },
  microcopy: {
    curated: 'Curated for you.',
    based_on_lifestyle: 'Based on your lifestyle.',
    high_intent: 'High-intent match.',
    private_selection: 'Private property selection.',
    save_later: 'Save now, visit later.',
    advisor_whatsapp: 'Your advisor will confirm by WhatsApp.',
    no_spam: 'No spam. Solo seguimiento sobre tus matches y visitas.'
  },
  colors: {
    obsidian: '#050505',
    graphite: '#111111',
    charcoal: '#1A1A1A',
    champagne_gold: '#C9A45C',
    soft_gold: '#E6D3A3',
    ivory: '#F8F5EF',
    warm_white: '#FFFDF8',
    taupe: '#8A7A63',
    muted_gray: '#A3A3A3',
    success: '#1F7A4D',
    error: '#B42318'
  }
};

export default brandConfig;