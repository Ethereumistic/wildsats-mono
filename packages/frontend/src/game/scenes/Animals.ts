import { Scene, GameObjects } from 'phaser';
import axios from 'axios';

const API_URL = process.env.VITE_API_URL || 'http://localhost:3000';

interface Animal {
    name: string;
    price: number;
    description: string;
    image: string;
    health: number;
    speed: number;
    jump: number;
    ability: string;
    abilityUses: number | 'infinite';
    cost: number;
}

export class Animals extends Scene {
    animals: Animal[];
    npub?: string | null;
    ownedAnimals!: string[];
    currentAnimalIndex: number = 0;
    animalImage!: GameObjects.Image;
    animalNameText!: GameObjects.Text;
    animalInfoText!: GameObjects.Text;
    buyButton!: GameObjects.Text;

    constructor() {
        super('Animals');
        this.animals = [
            { 
                name: 'Cat', 
                price: 100, 
                description: 'A cute and cuddly companion',
                image: 'cat_image',
                health: 80,
                speed: 7,
                jump: 5,
                ability: 'Night Vision',
                abilityUses: 'infinite',
                cost: 100
            },
            { 
                name: 'Dog', 
                price: 150, 
                description: 'A loyal and playful friend',
                image: 'dog_image',
                health: 100,
                speed: 8,
                jump: 4,
                ability: 'Bark',
                abilityUses: 5,
                cost: 150
            },
            { 
                name: 'Rabbit', 
                price: 120, 
                description: 'A quick and agile hopper',
                image: 'rabbit_image',
                health: 60,
                speed: 10,
                jump: 8,
                ability: 'Burrow',
                abilityUses: 3,
                cost: 120
            },
        ];
    }

    init() {
        this.npub = localStorage.getItem('nostr_npub');
        console.log('NPUB from localStorage:', this.npub);
        if (!this.npub) {
            console.error('User not logged in');
            this.scene.start('Shop');
        }
    }

    async create() {
        if (!this.npub) return;

        await this.fetchOwnedAnimals();

        this.add.text(512, 50, 'Animal Shop', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5);

        // Animal display area
        this.animalImage = this.add.image(512, 250, this.animals[0].image).setScale(0.5);
        this.animalNameText = this.add.text(512, 350, this.animals[0].name, {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
        }).setOrigin(0.5);

        this.animalInfoText = this.add.text(512, 450, '', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#ffffff',
            align: 'center',
        }).setOrigin(0.5);

        // Left arrow
        const leftArrow = this.add.text(412, 250, '<', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
        }).setOrigin(0.5).setInteractive();

        // Right arrow
        const rightArrow = this.add.text(612, 250, '>', {
            fontFamily: 'Arial Black',
            fontSize: 48,
            color: '#ffffff',
        }).setOrigin(0.5).setInteractive();

        leftArrow.on('pointerdown', () => this.changeAnimal(-1));
        rightArrow.on('pointerdown', () => this.changeAnimal(1));

        this.buyButton = this.add.text(512, 600, 'Buy', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            backgroundColor: '#008000',
            padding: { x: 20, y: 10 },
        }).setOrigin(0.5).setInteractive();

        this.buyButton.on('pointerdown', () => this.buyAnimal(this.animals[this.currentAnimalIndex]));

        const backButton = this.add.text(100, 50, 'Back', {
            fontFamily: 'Arial Black',
            fontSize: 24,
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 10, y: 5 },
        }).setInteractive().on('pointerdown', () => this.scene.start('Shop'));

        this.updateAnimalInfo();
    }

    changeAnimal(direction: number) {
        this.currentAnimalIndex = (this.currentAnimalIndex + direction + this.animals.length) % this.animals.length;

        // Fade out current animal
        this.tweens.add({
            targets: [this.animalImage, this.animalNameText, this.animalInfoText],
            alpha: 0,
            duration: 200,
            onComplete: () => {
                this.updateAnimalInfo();
                // Fade in new animal
                this.tweens.add({
                    targets: [this.animalImage, this.animalNameText, this.animalInfoText],
                    alpha: 1,
                    duration: 200
                });
            }
        });
    }

    updateAnimalInfo() {
        const animal = this.animals[this.currentAnimalIndex];
        this.animalImage.setTexture(animal.image);
        this.animalNameText.setText(animal.name);
        this.animalInfoText.setText(
            `Health: ${animal.health}\n` +
            `Speed: ${animal.speed} u/s\n` +
            `Jump: ${animal.jump} units\n` +
            `Ability: ${animal.ability}\n` +
            `Uses: ${animal.abilityUses}\n` +
            `Cost: ${animal.cost} coins`
        );
    
        const isOwned = this.ownedAnimals.includes(animal.name);
        if (isOwned) {
            // If owned, destroy the existing button and create a non-interactive text
            if (this.buyButton) {
                this.buyButton.destroy();
            }
            this.buyButton = this.add.text(512, 600, 'Owned', {
                fontFamily: 'Arial Black',
                fontSize: 32,
                color: '#ffffff',
                backgroundColor: '#888888',
                padding: { x: 20, y: 10 },
            }).setOrigin(0.5);
        } else {
            // If not owned, create or update the buy button
            if (this.buyButton) {
                this.buyButton.destroy();
            }
            this.buyButton = this.add.text(512, 600, 'Buy', {
                fontFamily: 'Arial Black',
                fontSize: 32,
                color: '#ffffff',
                backgroundColor: '#008000',
                padding: { x: 20, y: 10 },
            }).setOrigin(0.5).setInteractive();
            this.buyButton.on('pointerdown', () => this.buyAnimal(animal));
        }
    }

async fetchOwnedAnimals() {
    try {
        const response = await axios.get(`${API_URL}/users/${this.npub}/characters`);
        this.ownedAnimals = response.data.characters;
        console.log('Owned animals:', this.ownedAnimals);
    } catch (error) {
        console.error('Error fetching owned animals:', error);
        if (axios.isAxiosError(error) && error.response?.status === 404) {
            console.log('User not found, assuming new user with default Dog');
            this.ownedAnimals = ['Dog'];
        } else {
            console.error('Unexpected error, defaulting to empty array');
            this.ownedAnimals = [];
        }
    }
}

async buyAnimal(animal: Animal) {
    if (!this.npub) {
        console.error('User not logged in');
        return;
    }

    const url = `${API_URL}/users/${this.npub}/buy-animal`;
    const data = { animal: animal.name };

    console.log(`Attempting to buy ${animal.name} for user ${this.npub}`);
    console.log('Request URL:', url);
    console.log('Request data:', data);

    try {
        const response = await axios.post(url, data);
        console.log(`Server response for ${animal.name}:`, response.data);
        
        if (response.data.success) {
            await this.fetchOwnedAnimals(); // Refresh the list of owned animals
            this.updateAnimalInfo(); // Update the UI
            
            // Show success message
            this.showMessage(`Successfully bought ${animal.name}!`, '#00ff00');
        } else {
            // The purchase was processed but not successful
            this.showMessage(`Failed to buy ${animal.name}. ${response.data.message || 'Please try again.'}`, '#ff0000');
        }
    } catch (error) {
        console.error(`Error buying ${animal.name}:`, error);
        if (axios.isAxiosError(error)) {
            console.error('Response data:', error.response?.data);
            console.error('Response status:', error.response?.status);
            console.error('Response headers:', error.response?.headers);
            
            // Check if the error response contains a message
            const errorMessage = error.response?.data?.message || `Failed to buy ${animal.name}. Please try again.`;
            this.showMessage(errorMessage, '#ff0000');
        } else {
            this.showMessage(`Unexpected error. Please try again.`, '#ff0000');
        }
    }
}

private showMessage(message: string, color: string) {
    const messageText = this.add.text(512, 700, message, {
        fontFamily: 'Arial',
        fontSize: 24,
        color: color
    }).setOrigin(0.5);

    // Remove the message after 2 seconds
    this.time.delayedCall(2000, () => {
        messageText.destroy();
    });
}
}