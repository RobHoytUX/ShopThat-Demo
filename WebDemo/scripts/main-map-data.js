(function (global) {
  'use strict';

// Location data for chatbot explorer - Real locations near LV stores (matches product-dashboard)
const chatbotLocationData = {
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
    { lat: 40.7617, lng: -73.9789, name: 'The Baccarat Hotel', address: '28 W 53rd St', image: 'assets/restaurants/baccarat.jpg', keywords: ['The Baccarat', 'luxury', 'hotel', 'Museum of Modern Art', 'Central Park', 'Empire State Building', 'French cuisine', 'elegant bar', 'Afternoon tea', 'spa', 'gym', 'indoor pool'] },
    // Near Louis Vuitton SoHo
    { lat: 40.7232, lng: -73.9978, name: 'BALTHAZAR', address: '80 Spring St', image: 'assets/soho/restaurants/balthazar.png', keywords: ['Balthazar', 'French brasserie', 'SoHo', 'Louis Vuitton SoHo', 'restaurant', 'dining'] },
    { lat: 40.7303, lng: -74.0007, name: 'MINETTA TAVERN', address: '113 MacDougal St', image: 'assets/soho/restaurants/minetta-tavern.png', keywords: ['Minetta Tavern', 'Greenwich Village', 'SoHo', 'restaurant', 'burger', 'dining'] },
    { lat: 40.7271, lng: -73.9925, name: 'IL BUCO ALIMENTARI', address: '53 Great Jones St', image: 'assets/soho/restaurants/il-buco-alimentari.jpg', keywords: ['Il Buco Alimentari', 'NoHo', 'SoHo', 'Italian', 'restaurant'] },
    { lat: 40.7216, lng: -73.9946, name: 'ESTELLA', address: '47 E Houston St', image: 'assets/soho/restaurants/estela.png', keywords: ['Estela', 'SoHo', 'restaurant', 'downtown dining'] },
    { lat: 40.7196, lng: -74.0090, name: 'LOCANDA VERDE', address: '377 Greenwich St', image: 'assets/soho/restaurants/locanda-verde.png', keywords: ['Locanda Verde', 'Tribeca', 'SoHo', 'Italian', 'restaurant'] },
    { lat: 40.7245, lng: -74.0017, name: 'ST AMBROEUS', address: '265 Lafayette St', image: 'assets/soho/restaurants/st-ambroeus.png', keywords: ['Sant Ambroeus', 'SoHo', 'Italian cafe', 'restaurant'] },
    { lat: 40.7206, lng: -73.9947, name: "THE BUTCHER'S DAUGHTER", address: '19 Kenmare St', image: 'assets/soho/restaurants/butchers-daughter.png', keywords: ["The Butcher's Daughter", 'SoHo', 'vegetarian', 'brunch', 'restaurant'] },
    { lat: 40.7235, lng: -74.0010, name: 'LA MERCERIE', address: '53 Howard St', image: 'assets/soho/restaurants/la-mercerie.png', keywords: ['La Mercerie', 'SoHo', 'French', 'restaurant'] },
    // SoHo hotels
    { lat: 40.7220, lng: -74.0001, name: 'CROSBY STREET HOTEL', address: '79 Crosby St', image: 'assets/soho/hotels/crosby-street-hotel.png', keywords: ['Crosby Street Hotel', 'SoHo', 'luxury hotel', 'Firmdale'] },
    { lat: 40.7256, lng: -73.9926, name: 'THE BOWERY HOTEL', address: '335 Bowery', image: 'assets/soho/hotels/the-bowery-hotel.png', keywords: ['The Bowery Hotel', 'SoHo', 'luxury hotel', 'Gemma'] },
    { lat: 40.7268, lng: -73.9879, name: 'THE STANDARD EAST VILLAGE', address: '25 Cooper Square', image: 'assets/soho/hotels/standard-east-village.png', keywords: ['The Standard East Village', 'SoHo', 'luxury hotel', 'East Village'] },
    { lat: 40.7241, lng: -74.0003, name: 'THE MERCER', address: '147 Mercer St', image: 'assets/soho/hotels/the-mercer.png', keywords: ['The Mercer', 'SoHo', 'luxury hotel', 'Sartiano'] },
    { lat: 40.7191, lng: -74.0107, name: 'THE GREENWICH', address: '377 Greenwich St', image: 'assets/soho/hotels/the-greenwich.png', keywords: ['The Greenwich Hotel', 'Tribeca', 'SoHo', 'luxury hotel'] },
    { lat: 40.7186, lng: -74.0049, name: 'HOTEL BARRIERE FOUQUET', address: '456 Greenwich St', image: 'assets/soho/hotels/hotel-barriere-fouquet.png', keywords: ['Hotel Barriere Fouquet', 'Tribeca', 'SoHo', 'luxury hotel'] },
    { lat: 40.7220, lng: -73.9926, name: 'PUBLIC', address: '215 Chrystie St', image: 'assets/soho/hotels/public.png', keywords: ['PUBLIC Hotel', 'Lower East Side', 'SoHo', 'luxury hotel'] }
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
    { lat: 40.7228, lng: -74.0005, name: 'Peter Freeman Gallery', address: '140 Grand St', image: 'assets/kusama-gal3.png' },
    { lat: 40.7465, lng: -74.0070, name: 'David Zwirner Gallery', address: '525 W 19th St', image: 'assets/soho/galleries/david-zwirner.png' },
    { lat: 40.7159, lng: -74.0035, name: 'Jack Shainman Gallery', address: '46 Lafayette St', image: 'assets/soho/galleries/jack-shainman.png' },
    { lat: 40.7469, lng: -74.0064, name: 'Hauser & Wirth', address: '443 W 18th St', image: 'assets/soho/galleries/hauser-wirth.png' },
    { lat: 40.7489, lng: -74.0041, name: 'Gladstone Gallery', address: '515 W 24th St', image: 'assets/soho/galleries/gladstone-gallery.png' },
    { lat: 40.7481, lng: -74.0055, name: 'Gagosian Gallery', address: '555 W 24th St', image: 'assets/soho/galleries/gagosian-gallery.png' },
    { lat: 40.7490, lng: -74.0036, name: 'Lehmann Maupin', address: '501 W 24th St', image: 'assets/soho/galleries/lehmann-maupin.png' }
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


global.ShopThatMainMapData = chatbotLocationData;
})(typeof window !== 'undefined' ? window : this);
