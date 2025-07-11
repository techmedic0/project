// Global type declarations for external libraries and environment variables

declare global {
  interface Window {
    PaystackPop: {
      setup: (config: {
        key: string;
        email: string;
        amount: number;
        currency: string;
        callback: (response: any) => void;
        onClose: () => void;
      }) => {
        openIframe: () => void;
      };
     }
    };

   interface Property {
      id: string
      title: string
      description: string
      location: string
      detailed_location: string
      rooms_available: number
      total_rooms: number
      price: number
      tier: 'low' | 'mid' | 'premium'
      reservation_fee: number
      is_verified: boolean
      images: string[]
      video_url: string | null
      landlord_id: string
      created_at: string
    }

 

  // Vite environment variables
  interface ImportMetaEnv {
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_PAYSTACK_PUBLIC_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export { Property, Window, ImportMetaEnv, ImportMeta };