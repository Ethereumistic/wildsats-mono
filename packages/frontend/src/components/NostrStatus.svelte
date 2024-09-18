<script lang="ts">
  import { onMount } from 'svelte';
  import { EventBus } from '../game/EventBus';
  import { subscribeToUserEvents, pubkeyToNpub, getUserProfile } from '../nostr/LoginWithNostr';

  let pubkey: string | null = null;
  let npub: string | null = null;
  let userName: string | null = null;
  let userPicture: string | null = null;
  let latestEvent: string | null = null;

  onMount(() => {
    EventBus.on('nostr-login-success', async (key: string) => {
      pubkey = key;
      npub = pubkeyToNpub(key);
      const profile = await getUserProfile(key);
      userName = profile.name || 'Anonymous';
      userPicture = profile.picture || null;
      subscribeToUserEvents(key, (event) => {
        latestEvent = JSON.stringify(event, null, 2);
      });
    });

    EventBus.on('nostr-logout', () => {
      pubkey = null;
      npub = null;
      userName = null;
      userPicture = null;
      latestEvent = null;
    });
  });
</script>

<div class="nostr-status">
  {#if pubkey}
    <p>Logged in as: {userName}</p>
    <p>NPUB: {npub}</p>
    {#if userPicture}
      <img src={userPicture} alt="User avatar" class="user-avatar" />
    {/if}
    {#if latestEvent}
      <p>Latest event:</p>
      <pre>{latestEvent}</pre>
    {/if}
  {:else}
    <p>Not logged in</p>
  {/if}
</div>

<style>
  .nostr-status {
    position: absolute;
    top: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px;
    border-radius: 5px;
    font-family: Arial, sans-serif;
    font-size: 14px;
  }

  pre {
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .user-avatar {
    width: 50px;
    height: 50px;
    border-radius: 25px;
    margin-bottom: 10px;
  }
</style>