import * as nostr from 'nostr-tools';
import NDK, { NDKEvent, NDKSubscription, NDKUser } from '@nostr-dev-kit/ndk';
import axios from 'axios';

let ndk: NDK;

export async function initializeNDK() {
  ndk = new NDK({
    explicitRelayUrls: ['wss://relay.damus.io', 'wss://relay.snort.social', 'wss://nostr.build', 'wss://nostr.wine', 'wss://nostr.mom', 'wss://nostr.guru', 'wss://nostr.zebedee.cloud', 'wss://nostr.mutiny.nz', 'wss://nostr.openchain.fr', 'wss://nostr.nostr.build', 'wss://nostr.nostr.land', 'wss://nostr.nostr.re'],
  });
  await ndk.connect();
}

export async function loginWithNostr(): Promise<string | null> {
  if (!window.nostr) {
    console.error('No NOSTR provider found');
    return null;
  }

  try {
    const pubkey = await window.nostr.getPublicKey();
    return pubkey;
  } catch (error) {
    console.error('Error logging in with NOSTR:', error);
    return null;
  }
}

export function subscribeToUserEvents(pubkey: string, callback: (event: NDKEvent) => void) {
    const sub = ndk.subscribe(
      {
        kinds: [1],
        authors: [pubkey],
      },
      { closeOnEose: false }
    );
  
    sub.on('event', (event: NDKEvent) => {
      callback(event);
    });
  
    return sub;
  }

  export function pubkeyToNpub(pubkey: string): string {
    return nostr.nip19.npubEncode(pubkey);
  }

  export async function getUserProfile(pubkey: string): Promise<{ name?: string; picture?: string }> {
    const user = ndk.getUser({ pubkey });
    await user.fetchProfile();
    return {
      name: user.profile?.name,
      picture: user.profile?.image
    };
  }

  export async function saveUserData(nostrName: string, npub: string) {
    try {
      const response = await axios.post('http://localhost:3000/api/users', { nostrName, npub });
      console.log('User data saved:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving user data:', error);
      return null;
    }
  }

  export function logout() {
    // Implement logout logic here if needed
    // For now, we'll just return a resolved promise
    return Promise.resolve();
  }