(function (global) {
  'use strict';

// Location data for explorer - Real locations near LV stores
const locationData = {
  restaurants: [
    // Fine Dining & Luxury Restaurants
    { lat: 40.7614, lng: -73.9776, name: 'The Modern', address: '9 W 53rd St (at MoMA)', image: 'assets/restaurants/the-modern.jpg', keywords: ['The Modern', 'Restaurant', 'MoMA Museum', 'Sculpture Garden', 'lobster', 'truffles', 'cocktails', 'lunch', 'dinner', 'New York', '57th Street'] },
    { lat: 40.7619, lng: -73.9816, name: 'Le Bernardin', address: '155 W 51st St', image: 'assets/restaurants/le-bernardin.jpg', keywords: ['Le Bernardin', 'Elite French', 'Restaurant', 'Chef Eric Ripert', 'Michelin Star', 'seafood', 'wine', 'sommelier', 'expert service', 'luxurious decor', 'New York', '57th Street'] },
    { lat: 40.7741, lng: -73.9626, name: 'Cafe Carlyle', address: '35 E 76th St (The Carlyle)', image: 'assets/restaurants/cafe-carlyle.jpg', keywords: ['Cafe Carlyle', 'classic cabaret', 'concerts', 'iconic', 'cocktails', 'dress code', 'celebrities', 'evenings', '57th Street', 'New York'] },
    { lat: 40.7670, lng: -73.9800, name: 'Marea', address: '240 Central Park South', image: 'assets/restaurants/marea.jpg', keywords: ['Marea', 'High-end Italian seafood', 'housemade pastas', 'Central Park South', 'New York', '57th Street'] },
    { lat: 40.7754, lng: -73.9625, name: 'The Mark Restaurant by Jean-Georges', address: '25 E 77th St', image: 'assets/restaurants/the-mark-restaurant.jpg', keywords: ['Jean-Georges Vongerichten', 'Restaurant', 'Fresh from the market', 'The Mark Hotel', 'world class', 'innovative seasonings', 'hand crafted bar', 'comfortable dining room', '57th Street', 'New York'] },
    { lat: 40.7643, lng: -73.9683, name: 'Le Bilboquet', address: '20 E 60th St', image: 'assets/restaurants/le-bilboquet.jpg', keywords: ['Le Bilboquet', 'Upper East Side', 'French-inspired', 'global bistro', 'people watching', 'iconic', 'lunch', 'brunch', 'dinner', '57th Street', 'New York'] },
    // Luxury Hotels with Dining
    { lat: 40.7741, lng: -73.9626, name: 'The Carlyle Hotel', address: '35 E 76th St', image: 'assets/restaurants/carlyle-hotel.jpg', keywords: ['The Carlyle', 'most famous hotel', 'Upper East Side', 'old-world Manhattan sophistication', 'JFK\'s New York White House', 'Hotel', 'iconic', 'cabaret', '57th Street', 'New York'] },
    { lat: 40.7754, lng: -73.9625, name: 'The Mark Hotel', address: '25 E 77th St', image: 'assets/restaurants/mark-hotel.jpg', keywords: ['The Mark Hotel', 'Luxury', 'Hotel', 'Central Park', 'Metropolitan Museum of Art', 'Polished', 'art deco-inspired', 'fitness center', 'salon', 'swanky bar', 'restaurant', '57th Street', 'New York'] },
    { lat: 40.7644, lng: -73.9747, name: 'The Plaza', address: '768 5th Ave', image: 'assets/restaurants/the-plaza.jpg', keywords: ['The Plaza', 'Luxury', 'Hotel', 'Landmark 19th-century building', 'Central Park', 'Afternoon tea', 'spa', 'gym', '57th Street', 'New York'] },
    { lat: 40.7611, lng: -73.9738, name: 'The St. Regis', address: '2 E 55th St', image: 'assets/restaurants/st-regis.jpg', keywords: ['The St Regis', 'luxury', 'hotel', 'Midtown Manhattan', 'MoMA', 'Central Park', 'gym', 'steam room', 'iconic bar', '57th Street', 'New York'] },
    { lat: 40.7617, lng: -73.9789, name: 'The Baccarat Hotel', address: '28 W 53rd St', image: 'assets/restaurants/baccarat.jpg', keywords: ['The Baccarat', 'luxury', 'hotel', 'Museum of Modern Art', 'Central Park', 'Empire State Building', 'French cuisine', 'elegant bar', 'Afternoon tea', 'spa', 'gym', 'indoor pool'] }
  ],
  museums: [
    { lat: 40.7794, lng: -73.9632, name: 'The Metropolitan Museum', address: '1000 5th Ave', image: 'assets/museums/met-museum.jpg', keywords: ['The Met', 'Metropolitan Museum of Art', 'Museum', 'art', 'ancient art', 'European paintings', 'American art', 'Egyptian art', 'Central Park', 'Fifth Avenue', '57th Street', 'New York'] },
    { lat: 40.7614, lng: -73.9776, name: 'The Museum of Modern Art', address: '11 W 53rd St', image: 'assets/museums/moma.jpg', keywords: ['MoMA', 'Museum of Modern Art', 'Museum', 'modern art', 'contemporary art', 'Van Gogh', 'Picasso', 'Warhol', 'sculpture garden', 'Midtown', '57th Street', 'New York'] },
    { lat: 40.7829, lng: -73.9589, name: 'The Guggenheim', address: '1071 5th Ave', image: 'assets/museums/guggenheim.jpg', keywords: ['The Guggenheim', 'Solomon R. Guggenheim Museum', 'Museum', 'Frank Lloyd Wright', 'spiral architecture', 'modern art', 'contemporary art', 'Kandinsky', 'Upper East Side', '57th Street', 'New York'] },
    { lat: 40.7711, lng: -73.9673, name: 'The Frick Collection', address: '1 E 70th St', image: 'assets/museums/frick.jpg', keywords: ['The Frick', 'Frick Collection', 'Museum', 'European art', 'Old Masters', 'Vermeer', 'Rembrandt', 'mansion', 'gilded age', 'Upper East Side', '57th Street', 'New York'] }
  ],
  galleries: [
    // Near Louis Vuitton 57th Street
    { lat: 40.7571, lng: -73.9714, name: 'Pace Gallery', address: '540 W 25th St', image: 'assets/kusama-gal1.png' },
    { lat: 40.7605, lng: -73.9700, name: 'David Zwirner', address: '533 W 19th St', image: 'assets/kusama-gal2.png' },
    { lat: 40.7481, lng: -73.9940, name: 'Gagosian Gallery', address: '555 W 24th St', image: 'assets/kusama-gal3.png' },
    { lat: 40.7509, lng: -73.9975, name: 'Hauser & Wirth', address: '548 W 22nd St', image: 'assets/kusama-gal4.png' },
    // Near Louis Vuitton SoHo
    { lat: 40.7214, lng: -74.0018, name: 'Drawing Center', address: '35 Wooster St', image: 'assets/kusama-gal2.png' },
    { lat: 40.7235, lng: -73.9992, name: 'Team Gallery', address: '83 Grand St', image: 'assets/kusama-gal1.png' },
    { lat: 40.7228, lng: -74.0005, name: 'Peter Freeman Gallery', address: '140 Grand St', image: 'assets/kusama-gal3.png' }
  ],
  others: [
    // Luxury Shopping
    { lat: 40.7638, lng: -73.9744, name: 'Bergdorf Goodman', address: '754 5th Ave', image: 'assets/kusama1.png' },
    { lat: 40.7577, lng: -73.9788, name: 'Saks Fifth Avenue', address: '611 5th Ave', image: 'assets/kusama2.png' },
    { lat: 40.7625, lng: -73.9735, name: 'Tiffany & Co.', address: 'Fifth Avenue & 57th St', image: 'assets/kusama4.webp' },
    { lat: 40.7590, lng: -73.9775, name: 'Cartier', address: '653 5th Ave', image: 'assets/kusama3.png' },
    // Hotels & Landmarks
    { lat: 40.7644, lng: -73.9747, name: 'The Plaza Hotel', address: '768 5th Ave', image: 'assets/kusama1.png' },
    { lat: 40.7587, lng: -73.9787, name: 'Rockefeller Center', address: '45 Rockefeller Plaza', image: 'assets/kusama2.png' },
    // Near SoHo
    { lat: 40.7244, lng: -73.9976, name: 'Aesop', address: '113 Greene St', image: 'assets/kusama3.png' },
    { lat: 40.7241, lng: -74.0003, name: 'The Mercer Hotel', address: '147 Mercer St', image: 'assets/kusama4.webp' }
  ]
};


const storeLocations = [
  { lat: 40.7632, lng: -73.9732, name: 'Louis Vuitton 57th Street', address: '6 E 57th St, New York, NY 10022' },
  { lat: 40.7245, lng: -73.9975, name: 'Louis Vuitton SoHo', address: '116 Greene St, New York, NY 10012' }
];

global.ShopThatDashboardMapData = {
  locationData,
  storeLocations
};
})(typeof window !== 'undefined' ? window : this);
