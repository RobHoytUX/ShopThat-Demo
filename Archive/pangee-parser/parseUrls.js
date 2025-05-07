const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
    // List of URLs to parse
    const urls = [
'https://www.lvmh.com/en/news-lvmh/louis-vuitton-and-takashi-murakami-celebrate-20th-anniversary-of-era-defining-collaboration-with-launch-of-re-edition-collection',
'https://www.parisselectbook.com/en/2025/01/02/louis-vuitton-x-murakami-the-big-comeback-in-2025-with-zendaya-as-icon/',
'https://www.businesstoday.com.my/2025/03/12/cherry-blossom-season-lv-x-murakami-drops-this-week/',
'https://hypebeast.com/2025/3/louis-vuitton-louis-vuitton-murakami-cherry-blossoms-zendaya-spring-2025-chapter-two-collection-release-info',
'https://wwd.com/fashion-news/fashion-scoops/louis-vuitton-takashi-murakami-reeedition-cherry-blossom-1236998875/',
'https://www.harpersbazaar.com/uk/fashion/fashion-news/a63303096/louis-vuitton-murakami-collection/',
'https://www.lofficielph.com/fashion/louis-vuitton-unveils-second-chapter-of-its-murakami-collaboration',
'https://www.tatlerasia.com/style/fashion/louis-vuitton-murakami-chapter-two',
'https://www.wallpaper.com/fashion-beauty/fashion-beauty-events/louis-vuitton-murakami-london-pop-up-opens',
'https://www.centrepompidou.fr/en/magazine/article/focus-on-forest-companions-by-takashi-murakami',
'https://parissecret.com/en/murakami-giant-flower/',
'https://www.dazeddigital.com/fashion/article/66238/1/a-brief-history-of-the-louis-vuitton-x-takashi-murakami-collaboration',
'https://gagosian.com/artists/takashi-murakami/',
'https://www.fondationlouisvuitton.fr/fr/collection/artistes/takashi-murakami',
'https://www.fondationlouisvuitton.fr/fr/collection/oeuvres/kaikai-kiki',
'https://www.beauxarts.com/grand-format/des-fleurs-geantes-de-murakami-apparues-au-jardin-dacclimatation-a-paris/',
'https://www.fondationlouisvuitton.fr/en/collection/artworks/a-k-a-gero-tan-noah-s-ark',
'https://www.fondationlouisvuitton.fr/fr/collection/oeuvres/superflat-jellyfish-eyes-1',
'https://www.fondationlouisvuitton.fr/en/collection/artworks/and-then-when-that-s-done-i-change-what-i-was-yesterday-is-cast-aside-like-an-insect-shedding-its-skin',
'https://www.lifestyleasia.com/sg/style/fashion/louis-vuitton-takashi-murakami-20-years-collaboration-chapter-two/',
'https://www.harpersbazaar.com/uk/fashion/fashion-news/a63303096/louis-vuitton-murakami-collection/',
'https://galeriemagazine.com/superstar-artist-takashi-murakami-on-his-blockbuster-comeback/',
'https://culted.com/louis-vuitton-takashi-murakami-reedition-collection-big-deal/',
'https://www.parisselectbook.com/en/2025/01/13/louis-vuitton-x-takashi-murakami-a-collaboration-that-revives-the-famous-petite-malle/',
'https://hypebeast.com/2025/3/louis-vuitton-louis-vuitton-murakami-cherry-blossoms-zendaya-spring-2025-chapter-two-collection-release-info',
'https://www.theguardian.com/artanddesign/2024/dec/22/japanese-art-history-a-la-takashi-murakami-gagosian-grosvenor-hill-review',
'https://www.fondationlouisvuitton.fr/en/collection/artworks/max-and-shimon',
'https://news.artnet.com/art-world/takashi-murakami-manga-anime-superflat-2584227',
'https://observer.com/2025/02/review-japanese-art-history-a-la-takashi-murakami-gagosian-london/',
'https://numero.com/en/non-classifiee-2/interview-with-takashi-murakami-a-pop-icon/',
'https://www.mutualart.com/Exhibition/Takashi-Murakami/91F3BE02BDF35A77',
'https://hypebeast.com/2024/11/takashi-murakami-japanese-art-history-gagosian-london-exhibition',
'https://www.sortiraparis.com/en/what-to-visit-in-paris/exhibit-museum/articles/294058-takashi-murakami-an-exhibition-of-monumental-works-at-the-gagosian-gallery-le-bourget',
'https://www.esquire.com/uk/style/fashion/a63128052/takashi-murakami-talks-shogun-stress-and-his-re-edition-louis-vuitton-collection/',
'https://numero.com/en/non-classifiee-2/interview-with-takashi-murakami-a-pop-icon/',
'https://www.forbes.com/sites/yjeanmundelsalle/2023/07/20/takashi-murakami-on-his-first-exhibition-with-gagosian-gallery-in-france/',
'https://www.artnews.com/art-in-america/aia-reviews/takashi-murakami-2-61865/',
'https://www.vogue.com/article/takashi-murakami-le-bourget-gagosian-interview',
'https://ww.fashionnetwork.com/news/Virgil-abloh-takashi-murakami-show-opens-at-gagosian-london,952610.html',
'https://www.arabnews.jp/en/arts-culture/article_70997/',
'https://www.itsnicethat.com/news/virgil-abloh-takashi-murakami-gagosiangallery-art-120218',
'https://en.thevalue.com/articles/takashi-murakami-virgil-abloh-exhibition-technicolour-gagosian-paris',
'https://news.artnet.com/art-world/takashi-murakami-gagosian-2327577',
'https://news.artnet.com/art-world/louis-vuitton-takashi-murakami-reissue-zendaya-2594622',
'https://www.lofficielusa.com/fashion/louis-vuitton-murakami-re-edition-collection-zendaya',
'https://wwd.com/fashion-news/fashion-scoops/louis-vuitton-takashi-murakami-reeedition-cherry-blossom-1236998875/',
'https://www.essence.com/fashion/zendaya-olympics-2024-red-carpet/',
'https://hypebeast.com/2024/12/zendaya-louis-vuitton-takashi-murakami-re-edition-campaign-images-surfaces-online',
'https://wwd.com/pop-culture/celebrity-news/zendaya-louis-vuitton-spring-2025-paris-fashion-week-1236664202/',
'https://wwd.com/pop-culture/new-fashion-releases/zendaya-louis-vuitton-takashi-murakami-collection-media-1236793900/',
'https://harpersbazaar.com.au/louis-vuitton-murakami-chapter-two/',
'https://uk.fashionnetwork.com/news/Louis-vuitton-relaunches-anniversary-murakami-collab-campaign-stars-zendaya,1688725.html',
'https://www.lavanguardia.com/mediterranean/20241003/9993295/zendaya-ana-armas-spectacular-look-celebrity-louis-vuitton-fashion-show-paris-week-outfit-style-spring-summer-collection-brand-blanchett-vikander-moretz-connelly.html',
'https://orest.com.ua/fashion/zendaya-stars-in-louis-vuitton-x-murakami-s-sakura-inspired-collection',
    ];

    // Launch Puppeteer browser instance
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Create an output directory to store the HTML files
    const outputDir = path.join(__dirname, 'parsed_html');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir);
    }

    // Iterate over each URL
    for (const url of urls) {
        try {
            // Navigate to the URL and wait until the network is idle
            await page.goto(url, { waitUntil: 'networkidle2' });

            // Extract the page's HTML content
            const html = await page.content();

            // Sanitize the URL to create a valid file name (replace non-alphanumeric with underscore)
            const fileName = url.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.html';
            const filePath = path.join(outputDir, fileName);

            // Save the HTML content to a file
            fs.writeFileSync(filePath, html, 'utf-8');
            console.log(`Saved HTML for ${url} to ${filePath}`);

        } catch (error) {
            console.error(`Error processing ${url}: ${error}`);
        }
    }

    // Close the browser
    await browser.close();
})();
