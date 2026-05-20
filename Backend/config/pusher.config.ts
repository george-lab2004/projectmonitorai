import Pusher from "pusher";

// Initialize Pusher with credentials stored in environment variables
export const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID!,      // Identifies your specific application dashboard
    key: process.env.PUSHER_KEY!,          // Public key used by frontend client to connect
    secret: process.env.PUSHER_SECRET!,    // Private secret key used by backend to sign requests
    cluster: process.env.PUSHER_CLUSTER!,  // Regional data center hosting your socket connections (e.g., "ap2")
    useTLS: true                           // Encrypts all socket traffic over HTTPS/WSS (TLS)
});
