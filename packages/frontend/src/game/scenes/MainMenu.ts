import { GameObjects, Scene } from 'phaser';
import { 
    loginWithNostr, 
    initializeNDK, 
    logout, 
    pubkeyToNpub, 
    getUserProfile,
    saveUserData
} from '../../nostr/LoginWithNostr';

import { EventBus } from '../EventBus';
import { Shop } from './Shop';

export class MainMenu extends Scene
{
    background!: GameObjects.Image;
    logo!: GameObjects.Image;
    title!: GameObjects.Text;
    logoTween!: Phaser.Tweens.Tween | null;
    loginButton!: GameObjects.Text;
    logoutButton!: GameObjects.Text;
    userInfo!: GameObjects.Text;
    userAvatar!: GameObjects.Image;
    shopButton!: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.logo = this.add.image(512, 300, 'logo').setDepth(100);

        this.title = this.add.text(512, 460, 'Main Menu', {
            fontFamily: 'Arial Black', fontSize: 38, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(100);

        this.loginButton = this.add.text(512, 550, 'Login with NOSTR', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 20, y: 10 },
          })
            .setOrigin(0.5)
            .setInteractive()
            .on('pointerdown', this.handleLogin.bind(this));

            this.logoutButton = this.add.text(512, 550, 'Logout', {
                fontFamily: 'Arial Black',
                fontSize: 24,
                color: '#ffffff',
                backgroundColor: '#000000',
                padding: { x: 20, y: 10 },
              })
                .setOrigin(0.5)
                .setInteractive()
                .on('pointerdown', this.handleLogout.bind(this))
                .setVisible(false);

                this.shopButton = this.add.text(512, 600, 'Shop', {
                    fontFamily: 'Arial Black',
                    fontSize: 24,
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 20, y: 10 },
                })
                .setOrigin(0.5)
                .setInteractive()
                .on('pointerdown', () => this.scene.start('Shop'))
                .setVisible(false);
          
              this.userInfo = this.add.text(512, 500, '', {
                fontFamily: 'Arial',
                fontSize: 18,
                color: '#ffffff',
              }).setOrigin(0.5).setVisible(false);
          
              this.userAvatar = this.add.image(512, 450, 'default-avatar').setScale(0.5).setVisible(false);
      
          EventBus.emit('current-scene-ready', this);
      
          // Initialize NDK
          initializeNDK();
        }

        async handleLogin() {
            const pubkey = await loginWithNostr();
            if (pubkey) {
              console.log('Logged in with pubkey:', pubkey);
              const npub = pubkeyToNpub(pubkey);
              const profile = await getUserProfile(pubkey);
              const nostrName = profile.name || 'Anonymous';
              localStorage.setItem('nostr_pubkey', pubkey);
              localStorage.setItem('nostr_npub', npub); 
              // Save user data to the backend
              await saveUserData(nostrName, npub);
              
              EventBus.emit('nostr-login-success', pubkey);
              await this.updateUserInfo(pubkey);
              this.showLogoutButton();
            } else {
              console.log('Login failed');
              // You can show an error message to the user here
            }
        }

    async handleLogout() {
            await logout();
            localStorage.removeItem('nostr_pubkey');
            localStorage.removeItem('nostr_npub');  // Make sure this line is present
            this.showLoginButton();
            EventBus.emit('nostr-logout');
          }
          
    async updateUserInfo(pubkey: string) {
            const npub = pubkeyToNpub(pubkey);
            const profile = await getUserProfile(pubkey);
        
            this.userInfo.setText(`${profile.name || 'Anonymous'}\n${npub}`).setVisible(true);
            
            if (profile.picture) {
              this.load.image('user-avatar', profile.picture);
              this.load.once('complete', () => {
                this.userAvatar.setTexture('user-avatar').setVisible(true);
              });
              this.load.start();
            } else {
              this.userAvatar.setTexture('default-avatar').setVisible(true);
            }
        
            // this.showLogoutButton();
          }
    
    changeScene ()
    {
        if (this.logoTween)
        {
            this.logoTween.stop();
            this.logoTween = null;
        }

        this.scene.start('Game');
    }

    moveLogo (vueCallback: ({ x, y }: { x: number, y: number }) => void)
    {
        if (this.logoTween)
        {
            if (this.logoTween.isPlaying())
            {
                this.logoTween.pause();
            }
            else
            {
                this.logoTween.play();
            }
        } 
        else
        {
            this.logoTween = this.tweens.add({
                targets: this.logo,
                x: { value: 750, duration: 3000, ease: 'Back.easeInOut' },
                y: { value: 80, duration: 1500, ease: 'Sine.easeOut' },
                yoyo: true,
                repeat: -1,
                onUpdate: () => {
                    if (vueCallback)
                    {
                        vueCallback({
                            x: Math.floor(this.logo.x),
                            y: Math.floor(this.logo.y)
                        });
                    }
                }
            });
        }
    }

    showLogoutButton() {
        this.loginButton.setVisible(false);
        this.logoutButton.setVisible(true);
        this.shopButton.setVisible(true);
    }

    showLoginButton() {
        this.loginButton.setVisible(true);
        this.logoutButton.setVisible(false);
        this.userInfo.setVisible(false);
        this.userAvatar.setVisible(false);
        this.shopButton.setVisible(false);
    }
}

