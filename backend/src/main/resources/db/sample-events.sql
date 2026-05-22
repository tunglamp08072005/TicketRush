-- PostgreSQL seed data for TicketRush events.
-- Run this after the application has created the JPA tables.

begin;

create temp table seed_events (
    name text primary key,
    description text not null,
    location text not null,
    open_sale_date timestamp not null,
    sale_end_date timestamp not null,
    event_start_date timestamp not null,
    hero_image_url text not null,
    thumbnail_url text not null,
    layout_map_url text not null,
    seat_hold_minutes integer not null,
    featured boolean not null,
    public_visible boolean not null,
    archived boolean not null,
    status text not null,
    category text not null
) on commit drop;

insert into seed_events (
    name,
    description,
    location,
    open_sale_date,
    sale_end_date,
    event_start_date,
    hero_image_url,
    thumbnail_url,
    layout_map_url,
    seat_hold_minutes,
    featured,
    public_visible,
    archived,
    status,
    category
) values
('TicketRush Seed - Neon Nights Live', 'Live concert with electronic pop, laser stage, and premium seating.', 'SECC Hall A, Ho Chi Minh City', '2026-05-22 08:00:00', '2026-05-22 23:00:00', '2026-05-22 19:30:00', 'https://picsum.photos/seed/ticketrush-neon-nights/1400/700', 'https://picsum.photos/seed/ticketrush-neon-nights-thumb/600/400', 'https://picsum.photos/seed/ticketrush-neon-nights-map/1000/700', 10, true, true, false, 'ON_SALE', 'NHAC_SONG'),
('TicketRush Seed - Saigon Indie Fest', 'A multi-artist indie music night featuring young Vietnamese bands.', 'Hoa Binh Theater, Ho Chi Minh City', '2026-05-22 08:00:00', '2026-05-22 23:00:00', '2026-05-22 20:00:00', 'https://picsum.photos/seed/ticketrush-indie-fest/1400/700', 'https://picsum.photos/seed/ticketrush-indie-fest-thumb/600/400', 'https://picsum.photos/seed/ticketrush-indie-fest-map/1000/700', 10, true, true, false, 'ON_SALE', 'NHAC_SONG'),
('TicketRush Seed - Hanoi Acoustic Evening', 'Acoustic show with warm lighting and intimate theater seating.', 'Vietnam-Soviet Friendship Palace, Hanoi', '2026-05-22 08:00:00', '2026-05-22 23:00:00', '2026-05-22 19:00:00', 'https://picsum.photos/seed/ticketrush-acoustic/1400/700', 'https://picsum.photos/seed/ticketrush-acoustic-thumb/600/400', 'https://picsum.photos/seed/ticketrush-acoustic-map/1000/700', 10, true, true, false, 'ON_SALE', 'NHAC_SONG'),
('TicketRush Seed - Da Nang Summer Beats', 'Outdoor summer music event by the beach with reserved seating.', 'Bien Dong Park, Da Nang', '2026-05-22 08:00:00', '2026-05-22 23:00:00', '2026-05-22 18:30:00', 'https://picsum.photos/seed/ticketrush-summer-beats/1400/700', 'https://picsum.photos/seed/ticketrush-summer-beats-thumb/600/400', 'https://picsum.photos/seed/ticketrush-summer-beats-map/1000/700', 10, true, true, false, 'ON_SALE', 'NHAC_SONG'),
('TicketRush Seed - Laugh Lab Comedy', 'Stand-up comedy showcase with local and regional performers.', 'Ben Thanh Theater, Ho Chi Minh City', '2026-05-22 08:00:00', '2026-05-22 23:00:00', '2026-05-22 20:30:00', 'https://picsum.photos/seed/ticketrush-laugh-lab/1400/700', 'https://picsum.photos/seed/ticketrush-laugh-lab-thumb/600/400', 'https://picsum.photos/seed/ticketrush-laugh-lab-map/1000/700', 10, true, true, false, 'ON_SALE', 'SAN_KHAU'),
('TicketRush Seed - Modern Drama Night', 'A contemporary stage play with dramatic lighting and premium rows.', 'Youth Theater, Hanoi', '2026-05-22 08:00:00', '2026-05-23 23:00:00', '2026-05-23 19:30:00', 'https://picsum.photos/seed/ticketrush-drama/1400/700', 'https://picsum.photos/seed/ticketrush-drama-thumb/600/400', 'https://picsum.photos/seed/ticketrush-drama-map/1000/700', 10, false, true, false, 'ON_SALE', 'SAN_KHAU'),
('TicketRush Seed - Magic Stage Show', 'Family-friendly stage magic show with interactive audience moments.', 'Trung Vuong Theater, Da Nang', '2026-05-22 08:00:00', '2026-05-23 23:00:00', '2026-05-23 18:00:00', 'https://picsum.photos/seed/ticketrush-magic/1400/700', 'https://picsum.photos/seed/ticketrush-magic-thumb/600/400', 'https://picsum.photos/seed/ticketrush-magic-map/1000/700', 10, false, true, false, 'ON_SALE', 'SAN_KHAU'),
('TicketRush Seed - Startup Summit 2026', 'Conference for founders, operators, investors, and product builders.', 'GEM Center, Ho Chi Minh City', '2026-05-22 08:00:00', '2026-05-23 23:00:00', '2026-05-23 08:30:00', 'https://picsum.photos/seed/ticketrush-startup/1400/700', 'https://picsum.photos/seed/ticketrush-startup-thumb/600/400', 'https://picsum.photos/seed/ticketrush-startup-map/1000/700', 12, true, true, false, 'ON_SALE', 'HOI_THAO'),
('TicketRush Seed - AI Product Forum', 'A practical forum about AI products, automation, and applied software.', 'National Convention Center, Hanoi', '2026-05-22 08:00:00', '2026-05-23 23:00:00', '2026-05-23 09:00:00', 'https://picsum.photos/seed/ticketrush-ai-forum/1400/700', 'https://picsum.photos/seed/ticketrush-ai-forum-thumb/600/400', 'https://picsum.photos/seed/ticketrush-ai-forum-map/1000/700', 12, true, true, false, 'ON_SALE', 'HOI_THAO'),
('TicketRush Seed - Cloud Engineering Day', 'Technical conference for cloud, backend, DevOps, and platform teams.', 'Ariyana Convention Centre, Da Nang', '2026-05-22 08:00:00', '2026-05-23 23:00:00', '2026-05-23 09:00:00', 'https://picsum.photos/seed/ticketrush-cloud-day/1400/700', 'https://picsum.photos/seed/ticketrush-cloud-day-thumb/600/400', 'https://picsum.photos/seed/ticketrush-cloud-day-map/1000/700', 12, false, true, false, 'ON_SALE', 'HOI_THAO'),
('TicketRush Seed - Basketball Finals', 'High-energy basketball final with reserved court-side zones.', 'Phu Tho Stadium, Ho Chi Minh City', '2026-06-05 09:00:00', '2026-07-22 23:59:00', '2026-07-29 19:00:00', 'https://picsum.photos/seed/ticketrush-basketball/1400/700', 'https://picsum.photos/seed/ticketrush-basketball-thumb/600/400', 'https://picsum.photos/seed/ticketrush-basketball-map/1000/700', 8, true, true, false, 'UPCOMING', 'THE_THAO'),
('TicketRush Seed - Night Run Arena', 'Urban night running event with spectator seating and award stage.', 'My Dinh Stadium, Hanoi', '2026-06-06 09:00:00', '2026-08-01 23:59:00', '2026-08-08 18:30:00', 'https://picsum.photos/seed/ticketrush-night-run/1400/700', 'https://picsum.photos/seed/ticketrush-night-run-thumb/600/400', 'https://picsum.photos/seed/ticketrush-night-run-map/1000/700', 8, false, true, false, 'UPCOMING', 'THE_THAO'),
('TicketRush Seed - Esports Championship', 'Arena esports final with LED stage, team booths, and premium rows.', 'Quan Ngua Sports Palace, Hanoi', '2026-06-07 09:00:00', '2026-08-05 23:59:00', '2026-08-12 15:00:00', 'https://picsum.photos/seed/ticketrush-esports/1400/700', 'https://picsum.photos/seed/ticketrush-esports-thumb/600/400', 'https://picsum.photos/seed/ticketrush-esports-map/1000/700', 8, true, true, false, 'UPCOMING', 'THE_THAO'),
('TicketRush Seed - Food Culture Weekend', 'Food tasting, chef demos, and curated culinary experiences.', 'Tao Dan Park, Ho Chi Minh City', '2026-06-08 09:00:00', '2026-08-10 23:59:00', '2026-08-15 10:00:00', 'https://picsum.photos/seed/ticketrush-food-weekend/1400/700', 'https://picsum.photos/seed/ticketrush-food-weekend-thumb/600/400', 'https://picsum.photos/seed/ticketrush-food-weekend-map/1000/700', 10, true, true, false, 'UPCOMING', 'TRAI_NGHIEM'),
('TicketRush Seed - Art Immersion Hall', 'Immersive visual art exhibition with timed entry and seating zones.', 'VCCA, Hanoi', '2026-06-09 09:00:00', '2026-08-15 23:59:00', '2026-08-20 09:30:00', 'https://picsum.photos/seed/ticketrush-art-hall/1400/700', 'https://picsum.photos/seed/ticketrush-art-hall-thumb/600/400', 'https://picsum.photos/seed/ticketrush-art-hall-map/1000/700', 10, false, true, false, 'UPCOMING', 'TRAI_NGHIEM'),
('TicketRush Seed - Craft Beer Expo', 'Weekend tasting event with live music and reserved tasting tables.', 'Riverside Palace, Ho Chi Minh City', '2026-06-10 09:00:00', '2026-08-18 23:59:00', '2026-08-23 16:00:00', 'https://picsum.photos/seed/ticketrush-beer-expo/1400/700', 'https://picsum.photos/seed/ticketrush-beer-expo-thumb/600/400', 'https://picsum.photos/seed/ticketrush-beer-expo-map/1000/700', 10, false, true, false, 'UPCOMING', 'TRAI_NGHIEM'),
('TicketRush Seed - Film Music Orchestra', 'Symphonic performance of popular film scores in a concert hall.', 'Opera House, Ho Chi Minh City', '2026-06-11 09:00:00', '2026-08-25 23:59:00', '2026-08-30 20:00:00', 'https://picsum.photos/seed/ticketrush-film-orchestra/1400/700', 'https://picsum.photos/seed/ticketrush-film-orchestra-thumb/600/400', 'https://picsum.photos/seed/ticketrush-film-orchestra-map/1000/700', 10, true, true, false, 'UPCOMING', 'NHAC_SONG'),
('TicketRush Seed - Jazz Rooftop Session', 'Premium jazz night with reserved table-style seating.', 'Landmark 81 Sky Lounge, Ho Chi Minh City', '2026-06-12 09:00:00', '2026-09-01 23:59:00', '2026-09-05 20:30:00', 'https://picsum.photos/seed/ticketrush-jazz-rooftop/1400/700', 'https://picsum.photos/seed/ticketrush-jazz-rooftop-thumb/600/400', 'https://picsum.photos/seed/ticketrush-jazz-rooftop-map/1000/700', 10, true, true, false, 'UPCOMING', 'NHAC_SONG'),
('TicketRush Seed - Family Circus Day', 'Family circus show with matinee performance and safe seating areas.', 'Gia Dinh Park, Ho Chi Minh City', '2026-06-13 09:00:00', '2026-09-08 23:59:00', '2026-09-13 15:00:00', 'https://picsum.photos/seed/ticketrush-circus/1400/700', 'https://picsum.photos/seed/ticketrush-circus-thumb/600/400', 'https://picsum.photos/seed/ticketrush-circus-map/1000/700', 10, false, true, false, 'UPCOMING', 'KHAC'),
('TicketRush Seed - Design Expo Vietnam', 'Design exhibition covering interiors, brands, graphics, and retail spaces.', 'ICE Hanoi, Hanoi', '2026-06-14 09:00:00', '2026-09-15 23:59:00', '2026-09-20 09:00:00', 'https://picsum.photos/seed/ticketrush-design-expo/1400/700', 'https://picsum.photos/seed/ticketrush-design-expo-thumb/600/400', 'https://picsum.photos/seed/ticketrush-design-expo-map/1000/700', 10, false, true, false, 'UPCOMING', 'KHAC');

insert into events (
    name,
    description,
    location,
    open_sale_date,
    sale_end_date,
    event_start_date,
    hero_image_url,
    thumbnail_url,
    layout_map_url,
    seat_hold_minutes,
    featured,
    public_visible,
    archived,
    status,
    category,
    created_at
)
select
    se.name,
    se.description,
    se.location,
    se.open_sale_date,
    se.sale_end_date,
    se.event_start_date,
    se.hero_image_url,
    se.thumbnail_url,
    se.layout_map_url,
    se.seat_hold_minutes,
    se.featured,
    se.public_visible,
    se.archived,
    se.status,
    se.category,
    now()
from seed_events se
where not exists (
    select 1
    from events e
    where e.name = se.name
);

update events e
set
    description = se.description,
    location = se.location,
    open_sale_date = se.open_sale_date,
    sale_end_date = se.sale_end_date,
    event_start_date = se.event_start_date,
    hero_image_url = se.hero_image_url,
    thumbnail_url = se.thumbnail_url,
    layout_map_url = se.layout_map_url,
    seat_hold_minutes = se.seat_hold_minutes,
    featured = se.featured,
    public_visible = se.public_visible,
    archived = se.archived,
    status = se.status,
    category = se.category
from seed_events se
where e.name = se.name;

with zone_templates as (
    select *
    from (
        values
            ('VIP', 'VIP', '#ef4444', 'Front rows near the stage', 1200000.00, 2, 8, 1, 0),
            ('GOLD', 'Gold', '#f59e0b', 'Central seating with balanced view', 750000.00, 3, 10, 2, 2),
            ('STANDARD', 'Standard', '#2563eb', 'General reserved seating', 350000.00, 5, 12, 3, 5)
    ) as z(zone_code, zone_name, color_hex, location_description, price, row_count, seats_per_row, display_order, row_offset)
)
insert into event_zones (
    event_id,
    zone_name,
    zone_code,
    color_hex,
    location_description,
    price,
    row_count,
    seats_per_row,
    display_order
)
select
    e.id,
    z.zone_name,
    z.zone_code,
    z.color_hex,
    z.location_description,
    z.price,
    z.row_count,
    z.seats_per_row,
    z.display_order
from events e
join seed_events se on se.name = e.name
cross join zone_templates z
where not exists (
    select 1
    from event_zones ez
    where ez.event_id = e.id
      and ez.zone_code = z.zone_code
);

with zone_templates as (
    select *
    from (
        values
            ('VIP', 0),
            ('GOLD', 2),
            ('STANDARD', 5)
    ) as z(zone_code, row_offset)
),
seat_source as (
    select
        e.id as event_id,
        ez.id as zone_id,
        ez.zone_code,
        ez.price,
        chr(ascii('A') + z.row_offset + row_number - 1) as row_label,
        seat_number
    from events e
    join seed_events se on se.name = e.name
    join event_zones ez on ez.event_id = e.id
    join zone_templates z on z.zone_code = ez.zone_code
    cross join lateral generate_series(1, ez.row_count) as rows(row_number)
    cross join lateral generate_series(1, ez.seats_per_row) as numbers(seat_number)
)
insert into seats (
    event_id,
    zone_id,
    seat_code,
    row_label,
    seat_number,
    price,
    status,
    locked_by_user_id,
    locked_until
)
select
    ss.event_id,
    ss.zone_id,
    ss.zone_code || '-' || ss.row_label || ss.seat_number,
    ss.row_label,
    ss.seat_number,
    ss.price,
    'AVAILABLE',
    null,
    null
from seat_source ss
where not exists (
    select 1
    from seats s
    where s.event_id = ss.event_id
      and s.seat_code = ss.zone_code || '-' || ss.row_label || ss.seat_number
);

commit;
