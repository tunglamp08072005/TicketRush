-- TicketRush event seed data
-- Run manually in PostgreSQL when needed.
-- This script does not depend on backend runtime seeding.

INSERT INTO events (
    name,
    description,
    location,
    hero_image_url,
    thumbnail_url,
    open_sale_date,
    featured,
    status,
    created_at
)
VALUES
    (
        'CONCERT DEN VAU - CHUNG TA SE TRO THANH AI',
        'Dem nhac dac biet voi Den Vau, ghe ngoi gioi han va hieu ung san khau moi nhat.',
        'Nha thi dau Phu Tho, TP.HCM',
        'http://localhost:9000/ticketrush-images/posters/den-vau-2026-hero.jpg',
        'http://localhost:9000/ticketrush-images/posters/den-vau-2026-thumb.jpg',
        '2026-05-15 20:00:00',
        true,
        'UPCOMING',
        NOW()
    ),
    (
        'RAP VIET LIVE CONCERT 2026',
        'Su kien quy tu dan nghe si Rap Viet va khach moi quoc te.',
        'Nha thi dau Quan khu 7, TP.HCM',
        'http://localhost:9000/ticketrush-images/posters/rap-viet-live-hero.jpg',
        'http://localhost:9000/ticketrush-images/posters/rap-viet-live-thumb.jpg',
        '2026-05-18 19:30:00',
        true,
        'ON_SALE',
        NOW()
    ),
    (
        'SPACESPEAKERS GALAXY NIGHT',
        'Dai nhac hoi EDM va Hip-hop voi visual 3D mapping quy mo lon.',
        'Q7 Exhibition Center, TP.HCM',
        'http://localhost:9000/ticketrush-images/posters/spacespeakers-galaxy-hero.jpg',
        'http://localhost:9000/ticketrush-images/posters/spacespeakers-galaxy-thumb.jpg',
        '2026-06-01 20:00:00',
        true,
        'UPCOMING',
        NOW()
    ),
    (
        'INDIE PULSE NIGHT',
        'Dem nhac acoustic va indie pop voi khong gian than mat.',
        'The Observatory, TP.HCM',
        'http://localhost:9000/ticketrush-images/posters/indie-pulse-hero.jpg',
        'http://localhost:9000/ticketrush-images/posters/indie-pulse-thumb.jpg',
        '2026-06-12 19:00:00',
        false,
        'UPCOMING',
        NOW()
    );
