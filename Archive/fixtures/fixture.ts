import {PrismaClient} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {v4 as uuidv4} from "uuid";

const prisma = new PrismaClient();

async function main() {
    await prisma.$transaction([
        prisma.widget.deleteMany(),
        prisma.dashboard.deleteMany(),
        prisma.article.deleteMany(),
        prisma.keyword.deleteMany(),
        prisma.publisher.deleteMany(),
        prisma.user.deleteMany(),
        prisma.comapaingItems.deleteMany(),
        prisma.comapaings.deleteMany(),
        prisma.products.deleteMany(),
        prisma.categories.deleteMany(),
        prisma.message.deleteMany(),
        prisma.chat.deleteMany(),
        prisma.keyWords.deleteMany(),
        // prisma.chatBotSettings.deleteMany(),
        // prisma.documents.deleteMany(),
        // ... add other tables as needed
    ]);

    const username = 'testuser';
    const password = 'testpassword';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
        where: {username},
    });

    if (!existingUser) {
        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user
        await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

        console.log(`User "${username}" created successfully.`);
    } else {
        console.log(`User "${username}" already exists.`);
    }

    await prisma.documents.create({
        data: {
            url: 'https://vmagazine.com/article/louis-vuitton-and-yayoi-kusama-release-star-studded-creating-infinity-campaign/',
            isActive: true,
            external: false,
        }
    });
    await prisma.documents.create({
        data: {
            url: 'https://www.harpersbazaar.com.sg/fashion/louis-vuitton-announces-another-collaboration-with-artist-yayoi-kusama',
            isActive: true,
            external: false,
        }
    });
    await prisma.documents.create({
        data: {
            url: 'https://vogue.sg/louis-vuitton-and-yayoi-kusama-collaboration/',
            isActive: true,
            external: false,
        }
    });
    await prisma.documents.create({
        data: {
            url: '',
            isActive: true,
            external: false,
        }
    });
    await prisma.documents.create({
        data: {
            url: '',
            isActive: true,
            external: false,
        }
    });
    await prisma.documents.create({
        data: {
            url: '',
            isActive: true,
            external: false,
        }
    });
    console.log('Documents seeded');

    const InternalDocuments = [
        {
            id: 349,
            title: 'Louis Vuitton and Yayoi Kusama Release Star Studded Creating Infinity Campaign'.slice(0, 20) + '...',
            link: 'https://vmagazine.com/article/louis-vuitton-and-yayoi-kusama-release-star-studded-creating-infinity-campaign/',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
        {
            id: 350,
            title: 'Louis Vuitton Announces Another Collaboration with Artist Yayoi Kusama'.slice(0, 20) + '...',
            link: 'https://www.harpersbazaar.com.sg/fashion/louis-vuitton-announces-another-collaboration-with-artist-yayoi-kusama',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
        {
            id: 351,
            title: 'Louis Vuitton and Yayoi Kusama Collaboration'.slice(0, 20) + '...',
            link: 'https://vogue.sg/louis-vuitton-and-yayoi-kusama-collaboration/',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
    ]

    const InternalDocuments2 = [
        {
            title: 'Jennifer Connely Stuns in Cruise 23'.slice(0, 20) + '...',
            link: 'https://www.myfacehunter.com/2022/11/jennifer-connelly-stars-in-louis.html',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
        {
            title: 'Jennifer Connely Poses in Shimmering Metallics'.slice(0, 20) + '...',
            link: 'https://anneofcarversville.com/fashion/2022/11/8/louis-vuitton-cruise-2023-david-sims',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
        {
            title: 'First Unveilled at the Salk Institute'.slice(0, 20) + '...',
            link: 'https://senatus.net/album/view/15135/',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
    ]

    const InternalDocuments3 = [
        {
            title: 'Louis Vuitton Revives Core Values with Roger Federer'.slice(0, 20) + '...',
            link: 'https://www.lvmh.com/en/news-lvmh/louis-vuitton-revives-core-values-with-roger-federer-and-rafael-nadal',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
    ]

    const InternalDocuments4 = [
        {
            title: 'Louis Vuitton and Takashi Murakami Celebrate 20th Anniversary'.slice(0, 20) + '...',
            link: 'https://www.lvmh.com/en/news-lvmh/louis-vuitton-and-takashi-murakami-celebrate-20th-anniversary-of-era-defining-collaboration-with-launch-of-re-edition-collection',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
        {
            title: 'Takashi Murakami'.slice(0, 20) + '...',
            link: 'https://www.fondationlouisvuitton.fr/fr/collection/artistes/takashi-murakami',
            value: Math.floor(Math.random() * (100 - 65 + 1) + 65),
            active: true,
        },
    ]

    const ExternalDocuments = [
        {
            id: 352,
            title: 'vogue.com | Roger Federer and Rafael Nadal on their “lifelong friendship,”'.slice(0, 20) + '...',
            value: Math.floor(Math.random() * (100 - 10 + 1) + 10),
            active: false
        },
        {
            id: 353,
            title: 'vogue.com | Roger Federer Rafael Nadal Louis Vuitton Core Values Campaign'.slice(0, 20) + '...',
            value: Math.floor(Math.random() * (100 - 10 + 1) + 10),
            active: false
        },
        {
            id: 354,
            title: 'elle.com | Louis Vuitton Sends a Maximalist Message at Paris Fashion Week'.slice(0, 20) + '...',
            value: Math.floor(Math.random() * (100 - 10 + 1) + 10),
            active: false
        },
    ]

    const QuickMonthlyOverview = [
        {
            title: 'Engagement Rate',
            value: '30%',
        },
        {
            title: 'Prompts',
            value: '1,300,000',
        },
        {
            title: 'Users',
            value: '600,000',
        },
        {
            title: 'Avg Time',
            value: '1.30 min',
        },
        {
            title: 'Conversions',
            value: '6,500',
        },
    ]

    const RevenueVsDataSpend = [
        {
            title: '1/3',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '1/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '3/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/2',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/3',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '1/3',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '1/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '3/4',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/2',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
        {
            title: '2/3',
            revenue: Math.floor(Math.random() * (150000 - 80000 + 1) + 80000),
            spend: Math.floor(Math.random() * (6000 - 3500 + 1) + 3500),
        },
    ];

    const dashboardHome = await prisma.dashboard.create({
        data: {
            id: '2c1d233b-5aad-465c-82c8-6921067ae368',
            widgets: {
                create: [
                    {
                        title: null,
                        description: 'Ecommerce Sales',
                        type: 'ecommerce-sales',
                        sortOrder: 1,
                        data: {
                            value: '$3,900,000',
                            delta: '+2%',
                        },
                    },
                    {
                        title: 'Top Products',
                        description: null,
                        type: 'top-products',
                        sortOrder: 2,
                        data: [
                            {
                                title: 'Product 1',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product1.6fba4f66.png',
                            },
                            {
                                title: 'Product 1',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product2.4f625484.png',
                            },
                            {
                                title: 'Product 1',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product3.3653ca04.png',
                            },
                        ],
                    },
                    {
                        title: 'Document Access',
                        description: null,
                        type: 'document-access',
                        sortOrder: 2,
                        data: {
                            sections: [
                                {
                                    title: 'Trending Internal documents',
                                    documents: InternalDocuments,
                                },
                                {
                                    title: 'Trending External documents',
                                    documents: ExternalDocuments,
                                },
                            ],
                        },
                    },
                    {
                        title: 'Quick Chatbot Overview',
                        description: null,
                        type: 'quick-overview',
                        sortOrder: 3,
                        data: QuickMonthlyOverview,
                    },
                    {
                        title: 'Amount Spend',
                        description: null,
                        type: 'amount-spend',
                        sortOrder: 4,
                        data: {
                            publishers: [
                                {
                                    title: 'Conde Nast',
                                    value: '$70,000',
                                },
                                {
                                    title: 'Hearst',
                                    value: '$20,000',
                                },
                                {
                                    title: 'Disney',
                                    value: '$30,000',
                                },
                            ],
                            // total: '$574.34',
                        },
                    },
                    {
                        title: 'Categories Spend',
                        description: null,
                        type: 'categories-spend',
                        sortOrder: 5,
                        data: [
                            {
                                title: 'Daily',
                                value: 5,
                            },
                            {
                                title: 'Weekly',
                                value: 18,
                            },
                            {
                                title: 'Monthly',
                                value: 27,
                            },
                            {
                                title: 'Quarterly',
                                value: 52,
                            },
                        ],
                    },
                    {
                        title: 'Revenue vs Data Spend',
                        description: null,
                        type: 'revenue-vs-data-spend',
                        sortOrder: 7,
                        data: RevenueVsDataSpend,
                    },
                    {
                        title: 'Revenue Trends',
                        description: null,
                        type: 'revenue-trends',
                        sortOrder: 8,
                        data: [
                            {
                                order: 1,
                                title: 'January',
                                value: 170,
                            },
                            {
                                order: 2,
                                title: 'February',
                                value: 250,
                            },
                            {
                                order: 3,
                                title: 'March',
                                value: 358,
                            },
                            {
                                order: 4,
                                title: 'April',
                                value: 437,
                            },
                            {
                                order: 5,
                                title: 'May',
                                value: 554,
                            },
                        ],
                    },
                    {
                        title: 'Top Keywords',
                        description: null,
                        type: 'top-keywords',
                        sortOrder: 9,
                        data: [
                            {
                                title: 'Roger Federer',
                                volume: '$200,000',
                            },
                            {
                                title: 'LV Sneakers',
                                volume: '$150,000',
                            },
                            {
                                title: 'Kusama',
                                volume: '0$',
                            },
                            {
                                title: 'Takashi Murakami',
                                volume: '$200,000',
                            },
                            {
                                title: 'Zendaya',
                                volume: '$170,000',
                            },
                            {
                                title: 'Makeup Look',
                                volume: '',
                            },
                            {
                                title: 'Zendaya Outfit',
                                volume: '',
                            },
                            {
                                title: 'Movies',
                                volume: '',
                            },
                            {
                                title: 'Red Carpet Looks',
                                volume: '',
                            },
                            {
                                title: 'Speedy Bandouliere',
                                volume: '',
                            },
                        ],
                    },
                ],
            },
        },
        include: {widgets: true},
    });

    console.log('Widgets Seeded:', dashboardHome);

    const dashboardOpenSource = await prisma.dashboard.create({
        data: {
            id: '0b1be03a-1d56-4999-a250-c177ed83418d',
            widgets: {
                create: [
                    {
                        title: 'Document Access',
                        description: null,
                        type: 'document-access',
                        sortOrder: 2,
                        data: {
                            sections: [
                                {
                                    title: 'External Documents',
                                    documents: [
                                        {
                                            title: 'Roger Federer - Wikipedia',
                                            link: 'https://en.wikipedia.org/wiki/Roger_Federer',
                                            value: 60,
                                        },
                                        {
                                            title: 'Rafael Nadal - Wikipedia',
                                            link: 'https://en.wikipedia.org/wiki/Rafael_Nadal',
                                            value: 40,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        title: 'Document Filter',
                        description: null,
                        type: 'document-filter',
                        sortOrder: 1,
                        data: [
                            {
                                title: 'Date of Publication',
                                checked: true,
                            },
                            {
                                title: 'Year of Publication',
                                value: true,
                            },
                            {
                                title: 'Topic: Alphabetical Order',
                                value: true,
                            },
                            {
                                title: 'Popularity',
                                value: true,
                            },
                        ],
                    },
                    // {
                    //   title: 'Current Document & Uses',
                    //   description: null,
                    //   type: 'open-source-documents',
                    //   sortOrder: 2,
                    //   data: [
                    //     [
                    //       {
                    //         title: 'Roger Federer - Wikipedia',
                    //         link: 'https://en.wikipedia.org/wiki/Roger_Federer',
                    //         value: 60,
                    //       },
                    //       {
                    //         title: 'Rafael Nadal - Wikipedia',
                    //         link: 'https://en.wikipedia.org/wiki/Rafael_Nadal',
                    //         value: 40,
                    //       },
                    //     ],
                    //   ],
                    // },
                    {
                        title: 'Quick Overview',
                        description: null,
                        type: 'quick-overview',
                        sortOrder: 3,
                        data: [
                            {
                                title: 'Chatbot Open Source Data',
                                value: '10,360',
                            },
                            {
                                title: 'Chatbot Prompts for Open Source',
                                value: '300,500',
                            },
                            {
                                title: 'Chatbot Open Source Percentage',
                                value: '17%',
                            }
                        ],
                    },
                    {
                        title: 'Categories Spend',
                        description: null,
                        type: 'categories-spend',
                        sortOrder: 4,
                        data: [
                            {
                                title: 'Daily',
                                value: 5,
                            },
                            {
                                title: 'Weekly',
                                value: 18,
                            },
                            {
                                title: 'Monthly',
                                value: 27,
                            },
                            {
                                title: 'Quarterly',
                                value: 52,
                            },
                        ],
                    },
                ],
            },
        },
        include: {widgets: true},
    });

    console.log('Widgets Seeded:', dashboardOpenSource);

    const dashboardFinancials = await prisma.dashboard.create({
        data: {
            id: '1f0a1576-be8c-4cf7-8f81-6f245d0ea40e',
            widgets: {
                create: [
                    {
                        title: 'Filters',
                        description: null,
                        type: 'Filters',
                        sortOrder: 1,
                        data: {
                            sections: [
                                {
                                    title: 'Popular Filters',
                                    documents: [
                                        {
                                            title: 'Top Keywords',
                                            value: true,
                                        },
                                        {
                                            title: 'Data Spend',
                                            value: true,
                                        },
                                        {
                                            title: 'Top Products',
                                            value: true,
                                        },
                                        {
                                            title: 'Quick Overview',
                                            value: true,
                                        },
                                        {
                                            title: 'Categories Trend',
                                            value: true,
                                        },
                                        {
                                            title: 'Revenue Trend',
                                            value: true,
                                        },
                                        {
                                            title: 'Gender',
                                            value: true,
                                        },
                                        {
                                            title: 'Age',
                                            value: true,
                                        },
                                        {
                                            title: 'Month',
                                            value: true,
                                        },
                                        {
                                            title: 'Day',
                                            value: true,
                                        },
                                    ],
                                },
                                {
                                    title: 'Time',
                                    documents: [
                                        {
                                            title: 'Day',
                                            checked: true,
                                        },
                                        {
                                            title: 'Week',
                                            value: true,
                                        },
                                        {
                                            title: '2 weeks',
                                            value: true,
                                        },
                                        {
                                            title: 'Month',
                                            value: true,
                                        },
                                    ],
                                },
                                {
                                    title: 'Delivery',
                                    documents: [
                                        {
                                            title: 'Age',
                                            checked: true,
                                        },
                                        {
                                            title: 'Gender',
                                            value: true,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        title: 'Top Keywords',
                        description: null,
                        type: 'top-keywords',
                        sortOrder: 2,
                        data: [
                            {
                                title: 'Bags',
                                volume: 432,
                            },
                            {
                                title: 'Lady Shoes',
                                volume: 432,
                            },
                            {
                                title: 'Known Bag',
                                volume: 432,
                            },
                            {
                                title: 'Belt',
                                volume: 432,
                            },
                            {
                                title: 'Amazing Shirt',
                                volume: 432,
                            },
                            {
                                title: 'Formal Suit',
                                volume: 12,
                            },
                            {
                                title: 'Dressing',
                                volume: 12,
                            },
                            {
                                title: 'Clothing',
                                volume: 12,
                            },
                            {
                                title: 'Leather bag',
                                volume: 12,
                            },
                            {
                                title: '258',
                                volume: 12,
                            },
                        ],
                    },
                    {
                        title: 'Quick OverView',
                        description: null,
                        type: 'quick-overview',
                        sortOrder: 3,
                        data: [
                            {
                                title: 'Total Page Views',
                                value: '2,249',
                            },
                            {
                                title: 'Unique Visitors',
                                value: '429',
                            },
                            {
                                title: 'Average Time on Page',
                                value: '83',
                            },
                            {
                                title: 'Total Pages Saved',
                                value: '129',
                            },
                        ],
                    },
                    {
                        title: 'Revenue vs Data Spend',
                        description: null,
                        type: 'revenue-vs-data-spend',
                        sortOrder: 4,
                        data: [
                            {
                                title: '1/3',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '1/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '3/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/2',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/3',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '1/3',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '1/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '3/4',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/2',
                                revenue: 40,
                                spend: 40,
                            },
                            {
                                title: '2/3',
                                revenue: 40,
                                spend: 40,
                            },
                        ],
                    },
                    {
                        title: 'Categories Spend',
                        description: null,
                        type: 'categories-spend',
                        sortOrder: 4,
                        data: [
                            {
                                title: 'Daily',
                                value: 5,
                            },
                            {
                                title: 'Weekly',
                                value: 18,
                            },
                            {
                                title: 'Monthly',
                                value: 27,
                            },
                            {
                                title: 'Quarterly',
                                value: 52,
                            },
                        ],
                    },
                    {
                        title: 'Revenue Trends',
                        description: null,
                        type: 'revenue-trends',
                        sortOrder: 6,
                        data: [
                            {
                                order: 1,
                                title: 'January',
                                value: 170,
                            },
                            {
                                order: 2,
                                title: 'February',
                                value: 250,
                            },
                            {
                                order: 3,
                                title: 'March',
                                value: 358,
                            },
                            {
                                order: 4,
                                title: 'April',
                                value: 437,
                            },
                            {
                                order: 5,
                                title: 'May',
                                value: 554,
                            },
                        ],
                    },
                ],
            },
        },
        include: {widgets: true},
    });

    console.log('Widgets Seeded:', dashboardFinancials);

    const dashboardPerformance = await prisma.dashboard.create({
        data: {
            id: 'fbf8ab70-13a9-40ee-bcb7-19e8fa75df64',
            widgets: {
                create: [
                    {
                        title: 'Quick Menu',
                        description: null,
                        type: 'quick-menu',
                        sortOrder: 1,
                        data: {
                            items: [
                                {
                                    title: 'Campaign',
                                    subMenu: true,
                                    active: false,
                                },
                                {
                                    title: 'Publishers',
                                    subMenu: false,
                                    active: false,
                                },
                                {
                                    title: 'Performance',
                                    subMenu: false,
                                    active: true,
                                },
                                {
                                    title: 'Products',
                                    subMenu: false,
                                    active: false,
                                },
                                {
                                    title: 'Media',
                                    subMenu: false,
                                    active: false,
                                },
                            ]
                        },
                    },
                    {
                        title: 'Revenue Trends',
                        description: null,
                        type: 'revenue-trends-wide',
                        sortOrder: 2,
                        data: [
                            {
                                order: 1,
                                date: "2024-03-07T12:49:39.776Z",
                                value: '170',
                            },
                            {
                                order: 2,
                                date: "2024-03-14T12:49:39.776Z",
                                value: '250',
                            },
                            {
                                order: 3,
                                date: "2024-03-21T12:49:39.776Z",
                                value: '200',
                            },
                            {
                                order: 4,
                                date: "2024-03-28T12:49:39.776Z",
                                value: '320',
                            },
                            {
                                order: 5,
                                date: "2024-04-07T12:49:39.776Z",
                                value: '300',
                            },
                            {
                                order: 6,
                                date: "2024-04-14T12:49:39.776Z",
                                value: '400',
                            },
                            {
                                order: 7,
                                date: "2024-04-21T12:49:39.776Z",
                                value: '380',
                            },
                            {
                                order: 8,
                                date: "2024-04-28T12:49:39.776Z",
                                value: '450',
                            },
                            {
                                order: 9,
                                date: "2024-05-07T12:49:39.776Z",
                                value: '430',
                            },
                            {
                                order: 10,
                                date: "2024-05-14T12:49:39.776Z",
                                value: '460',
                            },
                            {
                                order: 11,
                                date: "2024-05-21T12:49:39.776Z",
                                value: '400',
                            },
                            {
                                order: 12,
                                date: "2024-05-28T12:49:39.776Z",
                                value: '500',
                            },
                        ],
                    },
                    {
                        title: 'Quick Chatbot Overview',
                        description: null,
                        type: 'quick-overview',
                        sortOrder: 3,
                        data: QuickMonthlyOverview,
                    },
                    {
                        title: 'Categories Spend',
                        description: null,
                        type: 'categories-spend',
                        sortOrder: 4,
                        data: [
                            {
                                title: 'Daily',
                                value: 5,
                            },
                            {
                                title: 'Weekly',
                                value: 18,
                            },
                            {
                                title: 'Monthly',
                                value: 27,
                            },
                            {
                                title: 'Quarterly',
                                value: 52,
                            },
                        ],
                    },
                    {
                        title: 'Filters',
                        description: null,
                        type: 'Filters',
                        sortOrder: 5,
                        data: {
                            sections: [
                                {
                                    title: 'Popular Filters',
                                    documents: [
                                        {
                                            title: 'Top Keywords',
                                            value: true,
                                        },
                                        {
                                            title: 'Data Spend',
                                            value: true,
                                        },
                                        {
                                            title: 'Top Products',
                                            value: true,
                                        },
                                        {
                                            title: 'Quick Overview',
                                            value: true,
                                        },
                                        {
                                            title: 'Categories Trend',
                                            value: true,
                                        },
                                        {
                                            title: 'Revenue Trend',
                                            value: true,
                                        },
                                        {
                                            title: 'Gender',
                                            value: true,
                                        },
                                        {
                                            title: 'Age',
                                            value: true,
                                        },
                                        {
                                            title: 'Month',
                                            value: true,
                                        },
                                        {
                                            title: 'Day',
                                            value: true,
                                        },
                                    ],
                                },
                                {
                                    title: 'Time',
                                    documents: [
                                        {
                                            title: 'Day',
                                            checked: true,
                                        },
                                        {
                                            title: 'Week',
                                            value: true,
                                        },
                                        {
                                            title: '2 weeks',
                                            value: true,
                                        },
                                        {
                                            title: 'Month',
                                            value: true,
                                        },
                                    ],
                                },
                                {
                                    title: 'Delivery',
                                    documents: [
                                        {
                                            title: 'Age',
                                            checked: true,
                                        },
                                        {
                                            title: 'Gender',
                                            value: true,
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                    {
                        title: 'Revenue vs Data Spend',
                        description: null,
                        type: 'revenue-vs-data-spend',
                        sortOrder: 6,
                        data: RevenueVsDataSpend,
                    },
                    {
                        title: 'Top Products',
                        description: null,
                        type: 'top-products',
                        sortOrder: 7,
                        data: [
                            {
                                title: 'Product 1',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product1.6fba4f66.png',
                            },
                            {
                                title: 'Product 2',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product2.4f625484.png',
                            },
                            {
                                title: 'Product 3',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product3.3653ca04.png',
                            },
                            {
                                title: 'Product 4',
                                imageUrl: 'https://pangee-siecwauy.xyz/img/product4.d7147d81.png',
                            },
                            {
                                title: 'Product 5',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product5.322b0f1b.png',
                            },
                            {
                                title: 'Product 6',
                                imageUrl:
                                    'https://pangee-siecwauy.xyz/img/product6.f333f6a0.png',
                            },
                        ],
                    },
                    {
                        title: 'Revenue Trends',
                        description: null,
                        type: 'revenue-trends',
                        sortOrder: 8,
                        data: [
                            {
                                order: 1,
                                title: 'January',
                                value: 170,
                            },
                            {
                                order: 2,
                                title: 'February',
                                value: 250,
                            },
                            {
                                order: 3,
                                title: 'March',
                                value: 358,
                            },
                            {
                                order: 4,
                                title: 'April',
                                value: 437,
                            },
                            {
                                order: 5,
                                title: 'May',
                                value: 554,
                            },
                        ],
                    },

                    {
                        title: 'Top Keywords',
                        description: null,
                        type: 'top-keywords',
                        sortOrder: 1,
                        data: [
                            {
                                title: 'Yayoi Kusama',
                                volume: 432,
                            },
                            {
                                title: 'Kusama',
                                volume: 274,
                            },
                            {
                                title: 'Dots',
                                volume: 190,
                            },
                            {
                                title: 'Infinity',
                                volume: 373,
                            },
                            {
                                title: 'Paintings',
                                volume: 57,
                            },
                            {
                                title: 'Bags',
                                volume: 804,
                            },
                        ],
                    },
                ],
            },
        },
        include: {widgets: true},
    });

    console.log('Widgets Seeded:', dashboardPerformance);

    const dashboardMedia = await prisma.dashboard.create({
        data: {
            id: '83c5c3f5-f765-4e69-a953-909788913552',
            widgets: {
                create: [
                    {
                        title: 'Quick Menu',
                        description: null,
                        type: 'quick-menu',
                        sortOrder: 1,
                        data: {
                            items: [
                                {
                                    title: 'Campaign',
                                    subMenu: true,
                                    active: false,
                                },
                                {
                                    title: 'Publishers',
                                    subMenu: false,
                                    active: false,
                                },
                                {
                                    title: 'Performance',
                                    subMenu: false,
                                    active: false,
                                },
                                {
                                    title: 'Products',
                                    subMenu: false,
                                    active: false,
                                },
                                {
                                    title: 'Media',
                                    subMenu: false,
                                    active: true,
                                },
                            ]
                        },
                    },
                    {
                        title: 'Media',
                        description: null,
                        type: 'media-view',
                        sortOrder: 2,
                        data: [
                            {
                                order: 1,
                                imageUrl: "",
                                title: "Rafael Nadal",
                                labels: [
                                    {
                                        color: 'purple',
                                        title: 'Spring 2024'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 2,
                                imageUrl: "",
                                title: "Roger Federer",
                                labels: [
                                    {
                                        color: 'purple',
                                        title: 'Spring 2024'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 3,
                                imageUrl: "",
                                title: "Annie Leibovitz",
                                labels: [
                                    {
                                        color: 'orange',
                                        title: 'Create Team'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 4,
                                imageUrl: "",
                                title: "Pharrell Williams",
                                labels: [
                                    {
                                        color: 'orange',
                                        title: 'Create Team'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 5,
                                imageUrl: "",
                                title: "Zendaya",
                                labels: [
                                    {
                                        color: 'purple',
                                        title: 'Spring 2024'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 6,
                                imageUrl: "",
                                title: "LVMH Olympics 2024",
                                labels: [
                                    {
                                        color: 'red',
                                        title: 'References'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 7,
                                imageUrl: "",
                                title: "Paris 2024 Olympics",
                                labels: [
                                    {
                                        color: 'red',
                                        title: 'References'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                            {
                                order: 8,
                                imageUrl: "",
                                title: "Eiffel Tower",
                                labels: [
                                    {
                                        color: 'blue',
                                        title: 'Insights'
                                    }
                                ],
                                dateAdded: "2021-01-05T12:49:39.776Z",
                                fileSize: '12Mb',
                            },
                        ],
                    },
                    {
                        title: 'Media Filter',
                        description: null,
                        type: 'media-filter',
                        sortOrder: 3,
                        data: {
                            sections: [
                                {
                                    title: 'Sort By',
                                    items: [
                                        {
                                            key: 'labels',
                                            value: 'Labels'
                                        }
                                    ]
                                },
                                {
                                    title: 'Media Used',
                                    items: [
                                        {
                                            key: 'all-media',
                                            value: 'All media'
                                        }
                                    ]
                                },
                                {
                                    title: 'Media Type',
                                    items: [
                                        {
                                            key: 'image',
                                            value: 'Image'
                                        }
                                    ]
                                },
                                {
                                    title: 'Time Uploaded',
                                    items: [
                                        {
                                            key: 'all-time',
                                            value: 'All time'
                                        }
                                    ]
                                },
                                {
                                    title: 'Time Uploaded',
                                    items: [
                                        {
                                            key: 'all-time',
                                            value: 'All time'
                                        }
                                    ]
                                },
                                {
                                    title: 'System Labels',
                                    items: [
                                        {
                                            color: 'purple',
                                            title: 'Spring 2024',
                                            count: 8
                                        },
                                        {
                                            color: 'orange',
                                            title: 'Create Team',
                                            count: 4
                                        },
                                        {
                                            color: 'red',
                                            title: 'References',
                                            count: 23
                                        },
                                        {
                                            color: 'blue',
                                            title: 'Insights',
                                            count: 6
                                        }
                                    ]
                                }
                            ],
                        },
                    },
                ],
            },
        },
        include: {widgets: true},
    });

    console.log('Widgets Seeded:', dashboardMedia);

    const dashboardPublishers = await prisma.dashboard.create({
        data: {
            id: '8cda3dbe-4ad2-48b3-bbd0-58bb1e957357',
            widgets: {
                create: [
                    {
                        title: 'Document Filter',
                        description: null,
                        type: 'publishers-document-filter',
                        sortOrder: 1,
                        data: [
                            {
                                title: 'Internal Documents',
                                checked: true,
                            },
                            {
                                title: 'External Documents',
                                checked: true,
                            }
                        ],
                    },
                    {
                        title: 'Current Documents & Uses',
                        description: null,
                        type: 'publishers-documents',
                        sortOrder: 2,
                        data: {
                            sections: [
                                {
                                    title: 'External Documents',
                                    items: [
                                        {
                                            title: 'https://www.lvmh.com/news-documents/news/louis-vuitton-revives-core-values-with-roger-federer-and-rafael-nadal/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://us.louisvuitton.com/eng-us/stories/core-values-campaign#behind-the-scene',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lvmh.com/news-documents/news/moet-chandon-celebrates-roger-federers-20-year-career-with-exclusive-limited-edition/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.vogue.co.uk/article/angelina-jolie-was-named-the-face-of-louis-vuittons-core-values-campaign-1#:~:text=2011%2C%20Angelina%20Jolie%20was%20unveiled,Louis%20Vuitton%20Alto%20holdall%20bag.',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lvmh.com/news-documents/news/louis-vuitton-protects-and-showcases-medals-and-torches-of-the-olympic-and-paralympic-games-paris-2024/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story/_/id/40161426/roger-federer-rafael-nadal-louis-vuitton-core-values-campaign',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/wimbledon13/story/_/id/9406464/wimbledon-decade-king-roger-federer%E2%80%99s-journey',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.forbes.com/sites/wesmoss/2024/06/27/roger-federers-success-a-surprising-lesson-for-your-investments/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.nytimes.com/2024/06/24/style/roger-federer-graduation-speech-dartmouth-tiktok-youtube.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.bbc.co.uk/sport/tennis/articles/cv228q9dg8do',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennis365.com/news/roger-federer-amazon-twelve-final-days-documentary',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.cnbc.com/2024/06/27/roger-federer-dartmouth-commencement-speech-how-to-be-more-resilient.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.ft.com/content/f31f19b9-5ed4-4b9e-b9ec-32ed36b38bb3',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://olympics.com/en/news/roger-federer-documentary-final-twelve-days-shows-vulnerability-goes-into-retirement-tennis',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://news.paddypower.com/tennis/2024/06/29/why-isnt-rafael-nadal-playing-wimbledon/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.express.co.uk/sport/tennis/1905345/Rafael-Nadal-2025-French-Open',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennisworldusa.org/tennis/news/Rafael_Nadal/146029/-rafael-nadal-exceeds-all-expectations-says-former-atp-ace/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.architecturaldigest.com/story/rafael-nadals-house-inside-the-tennis-stars-off-the-court-oasis',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.hollywoodreporter.com/lifestyle/style/louis-vuitton-core-values-campaign-roger-federer-rafael-nadal-1235901835/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/fashion-news/fashion-scoops/gallery/louis-vuitton-federer-nadal-campaign-photos-1236388876/roger-federer-rafael-nadal-louis-vuitton-core-values-photos-02/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.vogue.co.uk/article/blackpink-lisa-louis-vuitton-aw24',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.esquire.com/style/mens-fashion/a61234534/louis-vuitton-trunk-malle-courrier-history/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.theguardian.com/fashion/2024/mar/06/nicolas-ghesquiere-louis-vuitton-powerhouse-show-paris-fashion-week',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.ft.com/content/12216177-863e-4315-b3e8-1494cc71c59e',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/fashion-news/designer-luxury/louis-vuitton-olympic-trunks-medals-paris-1236285942/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://ca.movies.yahoo.com/news/jay-z-honor-andy-warhol-142923971.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lofficielph.com/hommes/louis-vuitton-2024-paris-olympics',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.theindustry.fashion/louis-vuitton-capitalises-on-paris-olympics-with-nba-star-ambassador/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/fashion-news/fashion-scoops/paris-2024-olympics-timothee-adolphe-lvmh-vuitton-1236268099/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://uk.style.yahoo.com/finance/news/lvmh-strikes-paris-olympic-games-163832588.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.msn.com/en-us/sports/other/ahead-of-the-olympics-louis-vuitton-ceo-says-sports-embody-the-dna-of-the-brand/ar-BB1nNsiA?ocid=BingNewsSearch',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/fashion-news/fashion-features/paris-olympics-closing-ceremony-fashion-louis-vuitton-dior-kevin-germanier-1236541056/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.collectingluxury.com/blog-1/lon-marchand-ambassador-for-louis-vuitton-2024',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://us.modalova.com/zine/leon-marchand-x-louis-vuitton-perfect-alliance/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lemilemagazine.com/news-archive/louis-vuitton-leon-marchand',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/fashion-news/fashion-scoops/louis-vuitton-signs-swimmer-leon-marchand-as-brand-ambassador-1235756281/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.nssmag.com/en/lifestyle/37690/leon-marchand-swimming-star-louis-vuitton-ambassador',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.ft.com/content/f18e53ba-5650-4e31-85a1-65a0875908a6',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.voguebusiness.com/story/companies/lvmhs-olympics-preparations-gather-steam',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.wsj.com/sports/olympics/louis-vuitton-olympics-paris-lvmh-sponsorship-76343e54',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lvmh.com/news-lvmh/olympic-games-paris-2024-lvmh-and-louis-vuitton-are-proud-to-welcome-leon-marchand',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lvmh.com/lvmh-is-premium-partner-of-the-olympic--paralympic-games-paris-2024',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lvmh.com/news-lvmh/celebrating-excellence-in-sports-and-savoir-faire-lvmh-opens-its-maison-for-the-olympic-and-paralympic-games-paris-2024',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lvmh.com/news-lvmh/on-july-14-and-15-lvmh-welcomed-the-paris-2024-olympic-flame-at-the-heart-of-emblematic-sites-of-the-group-place-de-la-monnaie-in-front-louis-vuitton-headquarters-as-well-as-the-fondation-louis-vuitton-and-jardin-dacclimatation',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.forbes.com/sites/daviddawkins/2021/09/17/how-this-swiss-shoemaker-convinced-tennis-legend-roger-federer-to-invest-in-their-frankenstein-sneakers/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://fortune.com/europe/2024/05/15/running-market-shoes-sales-roger-federer-backed-on-holdings/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennis365.com/news/roger-federer-on-shoes-valuation-money',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lemonde.fr/en/international/article/2024/02/15/roger-federer-makes-unforced-error-with-shoe-partnership_6528074_4.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.businessoffashion.com/news/retail/on-running-sales-surge/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://hypebeast.com/2024/7/zendaya-roger-federer-star-in-new-on-campaign-video',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennis365.com/news/roger-federer-on-shoes-valuation-money',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.gq.com.au/style/celebrity/the-eternal-style-of-roger-federer/image-gallery/35383bb816afd98975de7c6406177c62',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.irishtimes.com/sport/tennis/2022/09/16/style-with-substance-grace-with-athleticism-roger-federer-had-it-all/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/feature/roger-federer-mirka-style-1235612328/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.businessinsider.com/roger-federer-fashion-icon-2022-9#but-by-age-18-his-hair-was-long-and-he-played-with-a-high-ponytail-2',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.yahoo.com/news/roger-federer-is-on-a-mission-to-make-tennis-223304639.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennisactu.net/news-fashion-roger-federer-l-homme-le-plus-style-selon-gq-64012.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennisworldusa.org/tennis/news/Editors_Thoughts/138444/roger-federer-a-tennis-legend-who-embodies-style-class-and-fashion/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.seattletimes.com/explore/shop-northwest/how-roger-federer-developed-his-low-key-style/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://apollomagazine.fr/levolution-du-style-de-federer-sur-et-en-dehors-des-courts/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lequipe.fr/Tennis/Article/Pourquoi-roger-federer-a-marque-les-esprits-au-dela-du-tennis/1354421',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.lemonde.fr/en/m-le-mag/article/2022/10/05/roger-federer-gets-away-with-off-court-style-faults-does-anyone-care_5999254_117.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.forbes.com/sites/bluecarreon/2022/09/26/in-praise-of-roger-federers-winning-off-court-style/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.theguardian.com/fashion/2022/sep/22/the-enduring-style-of-roger-federer',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.forbes.com/sites/bluecarreon/2022/09/26/in-praise-of-roger-federers-winning-off-court-style/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://en.wikipedia.org/wiki/Roger_Federer',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://vogue.ph/fashion/uniqlo-lifewear-roger-federer-clare-waight-keller/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.gq.com/story/roger-federer-jonathan-anderson-uniqlo',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.gq-magazine.co.uk/article/exclusive-interview-roger-federer',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.vogue.com/slideshow/a-look-at-roger-federers-effortless-off-court-style',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://en.wikipedia.org/wiki/Rafael_Nadal',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.prestigeonline.com/id/style/fashion/rafael-nadals-best-on-court-outfits-2024/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.thevoiceoffashion.com/centrestage/features/rafael-nadals-advantage-point-in-fashion-6127',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.tennis.com/baseline/articles/rafael-nadal-fashion-retrospective-from-sleeveless-tops-and-pirate-pants-to-bold-and-bright-in-nike',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.wtatennis.com/news/4025294/how-nadals-style-and-technique-helped-shape-swiateks-clay-court-dominance',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.independent.co.uk/sport/tennis/rafael-nadal-davis-cup-retirement-federer-djokovic-b2650362.html',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://wwd.com/fashion-news/fashion-scoops/gallery/louis-vuitton-federer-nadal-campaign-photos-1236388876/',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.vogue.com/article/rafael-nadal-retirement-announcement',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.ellecanada.com/fashion/roger-federer-rafael-nadal-louis-vuitton-campaign',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story?id=42479927&_slug_=rafael-nadal-retirement-roger-federer-pens-emotive-tribute',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story?id=39828239&_slug_=roger-federer-deliver-dartmouth-commencement-address',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story/_/id/42395852/rafael-nadal-retires-davis-cup-king-clay-greatest-tennis-players',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story?id=39364315&_slug_=who-won-most-grand-slams-tennis-history',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story?id=37958330&_slug_=roger-federer-gets-standing-o-wimbledon-career-celebrated',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story?id=42581993&_slug_=rafael-nadal-wanted-low-key-retirement-ceremony-itf-prez-says',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story/_/id/42492215/rafael-nadal-career-ends-spain-eliminated-davis-cup',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                        {
                                            title: 'https://www.espn.com/tennis/story?id=40211136&_slug_=2024-french-open-rafael-nadal-broke-tennis-math-stats-titles',
                                            value: Math.floor(Math.random() * (85 - 10 + 1) + 10),
                                            active: false
                                        },
                                    ]
                                }
                            ]
                        },
                    },
                    {
                        title: 'Quick Overview',
                        description: null,
                        type: 'quick-overview',
                        sortOrder: 3,
                        data: [
                            {
                                title: 'Chatbot Publisher Articles',
                                value: '60,360',
                            },
                            {
                                title: 'Chatbot Prompts for Publisher Data',
                                value: '874,000',
                            },
                            {
                                title: 'Chatbot Open Source Percentage',
                                value: '53%',
                            },
                        ],
                    },
                    {
                        title: 'Top Publications',
                        description: null,
                        type: 'top-publications',
                        sortOrder: 3,
                        data: [
                            {
                                title: 'Vogue',
                                volume: '82.2%',
                            },
                            {
                                title: 'Elle Magazine',
                                volume: '2%',
                            },
                            {
                                title: 'Marie Claire',
                                volume: '60%',
                            },
                            {
                                title: 'Instyle Magazine',
                                volume: '43 sec',
                            },
                            {
                                title: 'Glamour Magazine',
                                volume: '43 sec',
                            },
                            {
                                title: 'Esquire Magazine',
                                volume: '43 sec',
                            }
                        ],
                    },
                    {
                        title: 'Top Grossing Keywords',
                        description: null,
                        type: 'top-grossing-keywords',
                        sortOrder: 4,
                        data: [
                            {
                                title: 'Roger Federer',
                                volume: '60.3%',
                            },
                            {
                                title: 'Rafael Nadal',
                                volume: '41.2%',
                            },
                            {
                                title: 'Oscars',
                                volume: '32.52%',
                            },
                            {
                                title: 'Olympics',
                                volume: '29.33%',
                            },
                            {
                                title: 'Zendaya',
                                volume: '18.45%',
                            },
                            {
                                title: 'Trio Messenger',
                                volume: '12.42%',
                            },
                        ],
                    },
                    {
                        title: 'Top Articles Used',
                        description: null,
                        type: 'top-articles-used',
                        sortOrder: 5,
                        data: [
                            {
                                title: 'Pharrell Takes Over as Louis Vuitton\'s',
                                volume: 13472,
                            },
                            {
                                title: 'Roger Federer and Nadal becomes',
                                volume: 11345,
                            },
                            {
                                title: 'New messanger bag revealed',
                                volume: 6345,
                            },
                            {
                                title: 'Louis Vuitton becomes the next',
                                volume: 4256,
                            },
                            {
                                title: 'Summer Olympics kickoff',
                                volume: 3852,
                            },
                            {
                                title: 'Brand ambassador becomes',
                                volume: 1563,
                            },
                        ],
                    }
                ],
            },
        },
        include: {widgets: true},
    });

    console.log('Widgets Seeded:', dashboardPublishers);

    const keywords = await prisma.keyword.createMany({
        data: [
            {title: 'Louis Vuitton', usagesCount: 100},
            {title: 'Louis Vuitton luxury', usagesCount: 100},
            {title: 'Louis Vuitton fashion', usagesCount: 100},
            {title: 'Louis Vuitton exclusivity', usagesCount: 100},
            {title: 'Louis Vuitton style', usagesCount: 100},
            {title: 'High-end designer', usagesCount: 100},
        ],
    });

    console.log('Keywords Seeded:', keywords);

    const articles = await prisma.article.createMany({
        data: [],
    });

    console.log('Articles Seeded:', articles);

    const lvmh = await prisma.publisher.create({
        data: {
            title: 'lvmh.com',
            description: 'lvmh.com',
            usagesCount: 130,
            logo: 'https://example.com/logo.jpg',
            articles: {
                create: [
                    {
                        title: "Pharrell Takes Over as Louis vuitton's Creative Director",
                        content:
                            "Pharrell's appointment signals a new era for LV, blending music and high fashion to attract a younger audience.",
                        usagesCount: 120,
                    },
                ],
            },
        },
    });

    console.log('Publisher Seeded:', lvmh);

    const louisvuitton = await prisma.publisher.create({
        data: {
            title: 'us.louisvuitton.com',
            description: 'us.louisvuitton.com',
            usagesCount: 130,
            logo: 'https://example.com/logo.jpg',
            articles: {
                create: [
                    {
                        title: "Pharrell Takes Over as Louis vuitton's Creative Director",
                        content:
                            "Pharrell's appointment signals a new era for LV, blending music and high fashion to attract a younger audience.",
                        usagesCount: 95,
                    },
                ],
            },
        },
    });

    console.log('Publisher Seeded:', louisvuitton);

    const vogue = await prisma.publisher.create({
        data: {
            title: 'vogue.co.uk',
            description: 'vogue.co.uk',
            usagesCount: 130,
            logo: 'https://example.com/logo.jpg',
            articles: {
                create: [
                    {
                        title: "Pharrell Takes Over as Louis vuitton's Creative Director",
                        content:
                            "Pharrell's appointment signals a new era for LV, blending music and high fashion to attract a younger audience.",
                        usagesCount: 95,
                    },
                ],
            },
        },
    });

    console.log('Publisher Seeded:', vogue);

    const compaingsData = [
        {
            order: 10,
            title: 'LV Cruise Campaign',
            subTitle: 'Fall 2023',
            imageUrl: 'https://pangee-siecwauy.xyz/img/campaign4.png',
            id: '68006f52-8b67-4161-86d3-641aef40c15b',
            dashboardTitle: "LV Cruise Campaign - Document Access",
        },
        {
            order: 20,
            title: 'Core Values Campaign',
            subTitle: 'Fall 2024',
            imageUrl: 'https://pangee-siecwauy.xyz/img/campaign2.png',
            id: 'd8499fce-fdd8-4ed8-9319-6eddc40c9b53',
            dashboardTitle: "Core Values Campaign - Document Access",
        },
        {
            order: 19,
            title: 'Louis Vuitton X Yayoi Kusama Campaign',
            subTitle: 'Spring 2023',
            imageUrl: 'https://pangee-siecwauy.xyz/img/campaign3.png',
            id: 'dace2615-6288-4105-9cff-c9c03bf8a385',
            dashboardTitle: "Louis Vuitton X Yayoi Kusama Campaign - Document Access",
        },
        {
            order: 40,
            title: 'LV x Takashi Kurakami Campaign',
            subTitle: 'Fall 2024',
            imageUrl: 'https://pangee-siecwauy.xyz/img/campaign1.png',
            id: '556b5777-7625-4419-bab2-141544b93b00',
            dashboardTitle: "LV x Takashi Kurakami Campaign - Document Access",
        },
    ];

    const campaingItemsNames = [
        'Roger Federer',
        'Pharrell Williams',
        'Annie Lieberwitz',
        'Raphael Nadal',
        'James Jordan',
        'Amy Lee',
        'Michael Vogal',
    ];

    const campaingItemTypes = [
        'Team',
        'Talent',
        'Theme',
        'Brand',
        'Location',
        'Publishers',
    ];

    const randomPDFLinks = [
        'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        'https://arxiv.org/pdf/1706.03762.pdf',
        'https://www.orimi.com/pdf-test.pdf',
        'https://unec.edu.az/application/uploads/2014/12/pdf-sample.pdf',
    ];

    const imageUrls = [
        'https://images.unsplash.com/5/unsplash-kitsune-4.jpg?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=bc01c83c3da0425e9baa6c7a9204af81',
        'https://images.unsplash.com/5/unsplash-kitsune-4.jpg?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=bc01c83c3da0425e9baa6c7a9204af81',
        'https://images.unsplash.com/5/unsplash-kitsune-4.jpg?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=bc01c83c3da0425e9baa6c7a9204af81',
        'https://images.unsplash.com/5/unsplash-kitsune-4.jpg?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=bc01c83c3da0425e9baa6c7a9204af81',
        'https://images.unsplash.com/5/unsplash-kitsune-4.jpg?ixlib=rb-0.3.5&ixid=eyJhcHBfaWQiOjEyMDd9&s=bc01c83c3da0425e9baa6c7a9204af81',
    ];

    const kasumaCampaingTimes = [
        {
            title: 'Gisele Bundchen',
            image: 'https://pangee-siecwauy.xyz/img/talent1.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Bella Hadid',
            image: 'https://pangee-siecwauy.xyz/img/talent2.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Anok Yai',
            image: 'https://pangee-siecwauy.xyz/img/talent3.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Justin Timberlake',
            image: 'https://pangee-siecwauy.xyz/img/talent4.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Karlie Kloss',
            image: 'https://pangee-siecwauy.xyz/img/talent5.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Fei Fei Sun',
            image: 'https://pangee-siecwauy.xyz/img/talent6.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Lea Seydoux',
            image: 'https://pangee-siecwauy.xyz/img/talent7.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Cate Blanchett',
            image: 'https://pangee-siecwauy.xyz/img/talent8.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Carine Roitfeld',
            image: 'https://pangee-siecwauy.xyz/img/talent9.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Steven Meisel',
            image: 'https://pangee-siecwauy.xyz/img/talent10.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Yayoi Kusama',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Art, Contemporary Art',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Dots, Radiant Pumpkins',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Colorful Faces',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Flowers, Infinity Dots',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Nets',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Louis Vuitton',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Brand',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Champs-Elysées',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Harrods',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Place Vendôme',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Tokyo',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },

    ]

    const campaingItemsCV = [
        {
            title: 'Roger Federer',
            image: 'https://pangee-siecwauy.xyz/img/talent1.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Rafael Nadal',
            image: 'https://pangee-siecwauy.xyz/img/talent2.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Annie Leibovitz',
            image: 'https://pangee-siecwauy.xyz/img/talent3.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Pharrell Williams',
            image: 'https://pangee-siecwauy.xyz/img/talent4.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Journeys',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Legends',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Tennis',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Close Friends',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Competition',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Louis Vuitton',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Brand',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'The Dolomites',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Italy',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
    ]

    const campaingItemsCruise = [
        {
            title: 'Jennifer Connelly',
            image: 'https://pangee-siecwauy.xyz/img/talent1.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Nicolas Ghesquière',
            image: 'https://pangee-siecwauy.xyz/img/talent2.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'David Sims',
            image: 'https://pangee-siecwauy.xyz/img/talent3.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Solar Panels',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Cruise',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Neo-Futurist Vision',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Nomadic Look',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Salk Institute',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Louis Vuitton',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Brand',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Undisclosed',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
    ]

    const campaingItemsMurakami = [
        {
            title: 'Zendaya',
            image: 'https://pangee-siecwauy.xyz/img/talent1.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Takashi Murakami',
            image: 'https://pangee-siecwauy.xyz/img/talent2.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Inez and Vinoodh',
            image: 'https://pangee-siecwauy.xyz/img/talent3.jpg',
            type: [
                'Talent',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'akashi Murakami',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Contemporary Art',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Pop Art',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Manga',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Monogram Multicolore',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Cherry Blossom',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Japan',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Anime',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Panda',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Theme',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Louis Vuitton',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Brand',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'London',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'Tokyo',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
        {
            title: 'New York',
            image: imageUrls[Math.floor(Math.random() * imageUrls.length)],
            type: [
                'Location',
            ],
            documents: {
                create: [
                    {url: randomPDFLinks[Math.floor(Math.random() * randomPDFLinks.length)]},
                ],
            },
        },
    ]

    // const createdCampaings = await Promise.all(
    //   compaingsData.sort((a, b) => a.order - b.order).map((camp) =>
    //     prisma.comapaings.create({
    //       data: {
    //         title: camp.title,
    //         subTitle: camp.subTitle,
    //         content: 'Lorem ipsum content...', // required
    //         imageUrl: camp.imageUrl,
    //         images: [camp.imageUrl],
    //         events: [],
    //         people: [],
    //         products: [],
    //         items: {
    //           create: [
    //             ...campaingItemsNames.map((name, index) => ({
    //               title: name,
    //               image: imageUrls[index % imageUrls.length],
    //               type: [
    //                 campaingItemTypes[
    //                   Math.floor(Math.random() * campaingItemTypes.length)
    //                 ],
    //               ],
    //               documents: {
    //                 create: [
    //                   { url: randomPDFLinks[index % randomPDFLinks.length] },
    //                   {
    //                     url: randomPDFLinks[(index + 1) % randomPDFLinks.length],
    //                   },
    //                   {
    //                     url: randomPDFLinks[(index + 2) % randomPDFLinks.length],
    //                   },
    //                   {
    //                     url: randomPDFLinks[(index + 3) % randomPDFLinks.length],
    //                   },
    //                   {
    //                     url: randomPDFLinks[(index + 4) % randomPDFLinks.length],
    //                   },
    //                   {
    //                     url: randomPDFLinks[(index + 5) % randomPDFLinks.length],
    //                   },
    //                 ],
    //               },
    //             })),
    //             ...randomPDFLinks.map((pdfUrl, i) => ({
    //               title: `Document ${i + 1}`,
    //               image: pdfUrl,
    //               type: ['Documents'],
    //             })),
    //           ],
    //         },
    //       },
    //     }),
    //   ),
    // );

    // const dashboardInternals = await prisma.dashboard.create({
    //   data: {
    //     id: '052452de-e8a2-46b5-a8ee-5ac593e05cb0',
    //     comapaingId: 'dace2615-6288-4105-9cff-c9c03bf8a385',
    //     widgets: {
    //       create: [
    //         {
    //           title: 'Quick Menu',
    //           description: null,
    //           type: 'quick-menu',
    //           sortOrder: 1,
    //           data: {
    //             items: [
    //               {
    //                 title: 'Campaign',
    //                 subMenu: true,
    //                 active: true,
    //               },
    //               {
    //                 title: 'Publishers',
    //                 subMenu: false,
    //                 active: false,
    //               },
    //               {
    //                 title: 'Performance',
    //                 subMenu: false,
    //                 active: false,
    //               },
    //               {
    //                 title: 'Products',
    //                 subMenu: false,
    //                 active: false,
    //               },
    //               {
    //                 title: 'Media',
    //                 subMenu: false,
    //                 active: false,
    //               },
    //             ]
    //           },
    //         },
    //         {
    //           title: 'Louis Vuitton X Yayoi Kusama Spring 2023 Campaign - Document Access',
    //           description: null,
    //           type: 'campaign-document-access',
    //           sortOrder: 2,
    //           data: {
    //             sections: [
    //               {
    //                 title: 'Internal documents',
    //                 documents: InternalDocuments,
    //               },
    //             ],
    //           },
    //         },
    //         {
    //           title: 'Granular Controls',
    //           description: null,
    //           type: 'campaign-granular-controls',
    //           sortOrder: 3,
    //           data: {
    //             sections: [
    //               {
    //                 title: 'Talent',
    //                 items: [
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Roger Federer',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist1.47f8942d.png',
    //                     active: true,
    //                   },
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Rafael Nadal',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist2.8f9291df.png',
    //                     active: true,
    //                   },
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Annie Leibovitz',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist3.748b548c.png',
    //                     active: true,
    //                   },
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Pharrell Williams',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist4.5d4325bb.png',
    //                     active: true,
    //                   },
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Zendaya',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist5.0ab5a7c9.png',
    //                     active: false,
    //                   },
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Yayoi Kusama',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist6.635f205c.png',
    //                     active: false,
    //                   },
    //                   {
    //                     id: uuidv4(),
    //                     title: 'Nicolas Ghesquière',
    //                     imageUrl: 'https://pangee-siecwauy.xyz/img/artist7.546b4d75.png',
    //                     active: false,
    //                   },
    //                 ]
    //               },
    //               {
    //                 title: 'Theme',
    //                 items: []
    //               },
    //               {
    //                 title: 'Brand',
    //                 items: []
    //               },
    //               {
    //                 title: 'Location',
    //                 items: []
    //               },
    //             ],
    //           },
    //         },
    //       ],
    //     },
    //   },
    //   include: { widgets: true },
    // });
    //
    // console.log('Widgets Seeded:', dashboardInternals);

    const createdCampaings = await Promise.all(
        compaingsData.sort((a, b) => a.order - b.order).map((camp) =>
            prisma.comapaings.create({
                data: {
                    id: camp.id,
                    title: camp.title,
                    subTitle: camp.subTitle,
                    content: 'Lorem ipsum content...', // required
                    imageUrl: camp.imageUrl,
                    images: [camp.imageUrl],
                    events: [],
                    people: [],
                    products: [],
                    publisherDashboardId: '8cda3dbe-4ad2-48b3-bbd0-58bb1e957357',
                    dashboard: {
                        create: {
                            widgets: {
                                create: [
                                    {
                                        title: 'Quick Menu',
                                        description: null,
                                        type: 'quick-menu',
                                        sortOrder: 1,
                                        data: {
                                            items: [
                                                {
                                                    title: 'Campaign',
                                                    subMenu: true,
                                                    active: true,
                                                },
                                                {
                                                    title: 'Publishers',
                                                    subMenu: false,
                                                    active: false,
                                                },
                                                {
                                                    title: 'Performance',
                                                    subMenu: false,
                                                    active: false,
                                                },
                                                {
                                                    title: 'Products',
                                                    subMenu: false,
                                                    active: false,
                                                },
                                                {
                                                    title: 'Media',
                                                    subMenu: false,
                                                    active: false,
                                                },
                                            ]
                                        },
                                    },
                                    {
                                        title: camp.dashboardTitle,
                                        description: null,
                                        type: 'campaign-document-access',
                                        sortOrder: 2,
                                        data: {
                                            sections: [
                                                {
                                                    title: 'Internal documents',
                                                    documents: (camp.title === 'Louis Vuitton X Yayoi Kusama Campaign') ? InternalDocuments : ((camp.title === 'LV Cruise Campaign') ? InternalDocuments2 : ((camp.title === 'Core Values Campaign') ? InternalDocuments3 : InternalDocuments4)),
                                                },
                                            ],
                                        },
                                    },
                                    {
                                        title: 'Granular Controls',
                                        description: null,
                                        type: 'campaign-granular-controls',
                                        sortOrder: 3,
                                        data: {
                                            sections: [
                                                {
                                                    title: 'Talent',
                                                    items: [
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Roger Federer',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist1.47f8942d.png',
                                                            active: true,
                                                        },
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Rafael Nadal',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist2.8f9291df.png',
                                                            active: true,
                                                        },
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Annie Leibovitz',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist3.748b548c.png',
                                                            active: true,
                                                        },
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Pharrell Williams',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist4.5d4325bb.png',
                                                            active: true,
                                                        },
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Zendaya',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist5.0ab5a7c9.png',
                                                            active: false,
                                                        },
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Yayoi Kusama',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist6.635f205c.png',
                                                            active: false,
                                                        },
                                                        {
                                                            id: uuidv4(),
                                                            title: 'Nicolas Ghesquière',
                                                            imageUrl: 'https://pangee-siecwauy.xyz/img/artist7.546b4d75.png',
                                                            active: false,
                                                        },
                                                    ]
                                                },
                                                {
                                                    title: 'Theme',
                                                    items: []
                                                },
                                                {
                                                    title: 'Brand',
                                                    items: []
                                                },
                                                {
                                                    title: 'Location',
                                                    items: []
                                                },
                                            ],
                                        },
                                    },
                                ],
                            },
                        }
                    },
                    items: {
                        create: (camp.title === 'Louis Vuitton X Yayoi Kusama Campaign') ? kasumaCampaingTimes : ((camp.title === 'LV Cruise Campaign') ? campaingItemsCruise : ((camp.title === 'Core Values Campaign') ? campaingItemsCV : campaingItemsMurakami)),
                    },
                },
            }),
        ),
    );
    console.log('Comapaings seeded:', createdCampaings.length);

    const createdCampaingItems = await Promise.all([
        ...campaingItemsNames.map((name, index) =>
            prisma.comapaingItems.create({
                data: {
                    title: name,
                    image: imageUrls[index % imageUrls.length],
                    type: [
                        campaingItemTypes[
                            Math.floor(Math.random() * campaingItemTypes.length)
                            ],
                    ],
                },
            }),
        ),
        ...randomPDFLinks.map((pdfUrl, i) =>
            prisma.comapaingItems.create({
                data: {
                    title: `Document ${i + 1}`,
                    image: pdfUrl,
                    type: ['Documents'],
                },
            }),
        ),
    ]);
    console.log('CampaingItems seeded:', createdCampaingItems.length);

    async function createCategoryWithChildren(
        parentTitle: string,
        childTitles: string[],
    ) {
        return prisma.categories.create({
            data: {
                title: parentTitle,
                description: `${parentTitle} description`,
                image: null,
                children: {
                    create: childTitles.map((child) => ({
                        title: child,
                        description: `${child} description`,
                        products: {
                            create: [
                                {
                                    title: `${child} Product 1`,
                                    image: 'https://placehold.co/600x400/000000/FFFFFF/png',
                                },
                                {
                                    title: `${child} Product 2`,
                                    image: 'https://placehold.co/600x400/000000/FFFFFF/png',
                                },
                            ],
                        },
                    })),
                },
            },
            include: {children: {include: {products: true}}},
        });
    }

    const readyToWear = await createCategoryWithChildren('Ready to wear', [
        'Dresses',
        'Skirts',
        'Top',
        'Pants',
        'Knitwears',
        'Coats & Jackets',
    ]);
    const accessories = await createCategoryWithChildren('Accessories', [
        'Bags',
        'SLG',
        'Belts',
        'Tech',
        'Luggage and Trunks',
        'Bathing Suit',
    ]);
    const shoes = await createCategoryWithChildren('Shoes', [
        'Heels',
        'Flats',
        'Sneakers',
        'Sandals',
        'Loafers',
        'CBoots',
    ]);
    const jewelry = await createCategoryWithChildren('Jewelry', [
        'Fashion Jewelry',
        'Fine Jewelry',
        'Watch',
    ]);
    const home = await createCategoryWithChildren('Home', [
        'Books',
        'Decor',
        'Furniture',
    ]);
    const beauty = await createCategoryWithChildren('Beauty', [
        'Fragrance',
        'Color',
        'Cosmetics',
        'Skincare',
    ]);

    console.log('Parent Categories created: 6');
    console.log(
        'Child Categories created:',
        readyToWear.children.length +
        accessories.children.length +
        shoes.children.length +
        jewelry.children.length +
        home.children.length +
        beauty.children.length,
    );

    const chat1 = await prisma.chat.create({
        data: {
            id: '3d7d0797-b7be-4e11-a028-18aa98f24c85',
        },
    });

    for (let i = 1; i <= 20; i++) {
        const role = i % 2 === 0 ? 'groq' : 'customer';
        await prisma.message.create({
            data: {
                chatId: chat1.id,
                role,
                content: `Message #${i} in Chat #1 from ${role}`,
                tags: [],
            },
        });
    }

    const chat2 = await prisma.chat.create({
        data: {},
    });

    for (let i = 1; i <= 20; i++) {
        const role = i % 2 === 0 ? 'groq' : 'customer';
        await prisma.message.create({
            data: {
                chatId: chat2.id,
                role,
                content: `Message #${i} in Chat #2 from ${role}`,
                tags: [],
            },
        });
    }

    console.log('2 chats created, each with 20 messages!');

    // await prisma.chatBotSettings.create({
    //   data: {
    //     key: 'system',
    //     value:
    //         "You are a Virtual Assistant specializing in LVMH (Moët Hennessy Louis Vuitton) products, events, and press releases. You generate sales-driven, concise (1-2 sentence) responses, ensuring luxury, exclusivity, and brand prestige.\n" +
    //         "\n" +
    //         "Information Retrieval & Scope:\n" +
    //         " • Strictly reference LVMH brands—ignore non-LVMH products and competitors.\n" +
    //         " • For people mentioned, retrieve data on their style and LVMH affiliations only.\n" +
    //         " • Prioritize LVMH press releases and official sources to ensure accuracy.\n" +
    //         "\n" +
    //         "Capabilities:\n" +
    //         " • Answer Questions: Provide compelling insights on LVMH products, collections, availability, and events.\n" +
    //         " • Make Recommendations: Suggest LVMH products or experiences tailored to user interests.\n" +
    //         "\n" +
    //         "Guidelines:\n" +
    //         " • If no LVMH-related data exists on a person or product, respond: “Unfortunately, I don’t have enough information.”\n" +
    //         " • Avoid speculation or discussing non-LVMH brands.\n" +
    //         " • Maintain a polished, professional, and engaging tone that reflects LVMH’s luxury appeal."
    //   },
    // });
    // console.log('ChatBotSettings seeded');

    const keyWords = [
        'Roger Federer',
        'Rafael Nadal',
        'Core Values Campaign',
        'Louis Vuitton',
    ]

    const relatedKeyWords = [
        [
            {
                keyWord: 'Rolex',
                active: true
            },
            {
                keyWord: 'Roger Federer',
                active: true
            },
            {
                keyWord: 'Rafael Nadal',
                active: true
            },
            {
                keyWord: 'Jennifer Connelly',
                active: true
            },
            {
                keyWord: 'Nicolas Ghesquiere',
                active: true
            },
        ],
        [
            {
                keyWord: 'Yayoi Kusama',
                active: true
            },
            {
                keyWord: 'Giselle Bundchen',
                active: true
            },
            {
                keyWord: 'Louis Vuitton',
                active: true
            },
            {
                keyWord: 'Fei Fei Sun',
                active: true
            },
            {
                keyWord: 'Justin Timberlake',
                active: true
            },
            {
                keyWord: 'Takashi Murakami',
                active: true
            },
        ],
        [
            {
                keyWord: 'Coussin Bags',
                active: true
            },
            {
                keyWord: 'Louis Vuitton',
                active: true
            },
            {
                keyWord: 'Sneakers',
                active: true
            },
            {
                keyWord: 'Core Values Campaign',
                active: true
            },
            {
                keyWord: 'Dolomites',
                active: true
            },
        ],
        [
            {
                keyWord: 'Yayoi Kusama',
                active: true
            },
            {
                keyWord: 'Giselle Bundchen',
                active: true
            },
            {
                keyWord: 'Louis Vuitton',
                active: true
            },
            {
                keyWord: 'Fei Fei Sun',
                active: true
            },
            {
                keyWord: 'Justin Timberlake',
                active: true
            },
            {
                keyWord: 'Takashi Murakami',
                active: true
            },
        ]
    ]

    for (let i = 0; i <= 3; i++) {
        await prisma.keyWords.create({
            data: {
                keyWord: keyWords[i],
                related: {
                    create: relatedKeyWords[i]
                },
                active: true,
            }
        });
    }

    console.log('Keywords seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


