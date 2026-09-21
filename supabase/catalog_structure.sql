-- Структура каталога: теги подкатегорий для существующих демо-товаров + новые демо-товары,
-- чтобы НИ ОДНА подкатегория не была пустой (Каталог → категория → подкатегория → товары).
-- ТОЛЬКО ДОБАВЛЯЕТ: существующие товары, фото, цены и названия не меняются (в характеристики
-- дописываются только теги подкатегорий). Новые товары вставляются, только если артикула ещё нет.
-- Запустить в Supabase → SQL Editor (можно повторно). Требует product_attributes.sql.

update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["cleansing"]'::jsonb) where sku = 'DEMO-FF-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["cleansing","makeup-removal"]'::jsonb) where sku = 'DEMO-FF-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["cleansing"]'::jsonb) where sku = 'DEMO-FF-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["cream"]'::jsonb) where sku = 'DEMO-FC-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["cream","antiage"]'::jsonb) where sku = 'DEMO-FC-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["cream","problem"]'::jsonb) where sku = 'DEMO-FC-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-hands"]'::jsonb) where sku = 'DEMO-FC-04';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["serum","antiage"]'::jsonb) where sku = 'DEMO-FS-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["serum"]'::jsonb) where sku = 'DEMO-FS-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["serum","problem"]'::jsonb) where sku = 'DEMO-FS-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["serum","antiage"]'::jsonb) where sku = 'DEMO-FS-04';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["mask"]'::jsonb) where sku = 'DEMO-FM-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["mask","problem"]'::jsonb) where sku = 'DEMO-FM-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["spf-face"]'::jsonb) where sku = 'DEMO-SP-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["spf-face"]'::jsonb) where sku = 'DEMO-SP-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["spf-face"]'::jsonb) where sku = 'DEMO-SS-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["spf-body"]'::jsonb) where sku = 'DEMO-SP-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["microneedle","antiage"]'::jsonb) where sku = 'DEMO-MN-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["microneedle","problem"]'::jsonb) where sku = 'DEMO-MN-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pdrn","serum","antiage"]'::jsonb) where sku = 'DEMO-PD-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pdrn","serum"]'::jsonb) where sku = 'DEMO-PD-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["toner"]'::jsonb) where sku = 'DEMO-TN-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["toner","problem"]'::jsonb) where sku = 'DEMO-TN-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["toner"]'::jsonb) where sku = 'DEMO-TN-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["scrub"]'::jsonb) where sku = 'DEMO-SC-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["scrub"]'::jsonb) where sku = 'DEMO-SC-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pad"]'::jsonb) where sku = 'DEMO-PA-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pad"]'::jsonb) where sku = 'DEMO-PA-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["eye","antiage"]'::jsonb) where sku = 'DEMO-EY-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["eye"]'::jsonb) where sku = 'DEMO-EY-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["lips"]'::jsonb) where sku = 'DEMO-LP-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["lips"]'::jsonb) where sku = 'DEMO-LP-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["patch","eye"]'::jsonb) where sku = 'DEMO-PT-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["patch","problem"]'::jsonb) where sku = 'DEMO-PT-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["patch","antiage"]'::jsonb) where sku = 'DEMO-PT-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["massage-face"]'::jsonb) where sku = 'DEMO-MS-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["massage-face"]'::jsonb) where sku = 'DEMO-MS-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["massage-body"]'::jsonb) where sku = 'DEMO-MS-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-lotion"]'::jsonb) where sku = 'DEMO-BD-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-lotion"]'::jsonb) where sku = 'DEMO-BC-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-scrub"]'::jsonb) where sku = 'DEMO-BD-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-feet","body-scrub"]'::jsonb) where sku = 'DEMO-FT-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-oil"]'::jsonb) where sku = 'DEMO-BD-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-oil","body-anticellulite"]'::jsonb) where sku = 'DEMO-CL-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-anticellulite"]'::jsonb) where sku = 'DEMO-CL-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-hands"]'::jsonb) where sku = 'DEMO-HN-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["body-feet"]'::jsonb) where sku = 'DEMO-FT-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["shampoo"]'::jsonb) where sku = 'DEMO-HS-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["shampoo"]'::jsonb) where sku = 'DEMO-HS-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["shampoo"]'::jsonb) where sku = 'DEMO-HS-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["shampoo"]'::jsonb) where sku = 'DEMO-HS-04';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["conditioner"]'::jsonb) where sku = 'DEMO-HC-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["conditioner"]'::jsonb) where sku = 'DEMO-HC-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["conditioner"]'::jsonb) where sku = 'DEMO-HC-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hair-mask"]'::jsonb) where sku = 'DEMO-HR-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hair-mask"]'::jsonb) where sku = 'DEMO-HK-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hair-mask"]'::jsonb) where sku = 'DEMO-HK-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hair-mask"]'::jsonb) where sku = 'DEMO-HK-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hair-care"]'::jsonb) where sku = 'DEMO-HR-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hair-care"]'::jsonb) where sku = 'DEMO-HR-04';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["lipstick"]'::jsonb) where sku = 'DEMO-MK-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["mascara"]'::jsonb) where sku = 'DEMO-MK-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["eyeshadow"]'::jsonb) where sku = 'DEMO-MK-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["perfume-women"]'::jsonb) where sku = 'DEMO-PF-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["perfume-unisex"]'::jsonb) where sku = 'DEMO-PF-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["perfume-set"]'::jsonb) where sku = 'DEMO-PF-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pharm-sensitive"]'::jsonb) where sku = 'DEMO-AP-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pharm-sensitive","pharm-repair"]'::jsonb) where sku = 'DEMO-AP-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["pharm-acne"]'::jsonb) where sku = 'DEMO-AP-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hyg-pads"]'::jsonb) where sku = 'DEMO-GG-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hyg-intimate"]'::jsonb) where sku = 'DEMO-GG-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["hyg-pads"]'::jsonb) where sku = 'DEMO-GG-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["uw-sets"]'::jsonb) where sku = 'DEMO-UW-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["uw-briefs"]'::jsonb) where sku = 'DEMO-UW-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["uw-bras"]'::jsonb) where sku = 'DEMO-UW-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["soap-liquid"]'::jsonb) where sku = 'DEMO-SO-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["soap-shower"]'::jsonb) where sku = 'DEMO-SO-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["soap-bar"]'::jsonb) where sku = 'DEMO-SO-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["home-candles"]'::jsonb) where sku = 'DEMO-HM-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["home-diffusers"]'::jsonb) where sku = 'DEMO-HM-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["home-textile"]'::jsonb) where sku = 'DEMO-HM-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["kids-wash"]'::jsonb) where sku = 'DEMO-KD-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["kids-care"]'::jsonb) where sku = 'DEMO-KD-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["kids-oral"]'::jsonb) where sku = 'DEMO-KD-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["acc-brushes"]'::jsonb) where sku = 'DEMO-AC-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["acc-hair"]'::jsonb) where sku = 'DEMO-AC-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["acc-bags"]'::jsonb) where sku = 'DEMO-AC-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["merch-bags"]'::jsonb) where sku = 'DEMO-MR-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["merch-clothing"]'::jsonb) where sku = 'DEMO-MR-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["merch-mugs"]'::jsonb) where sku = 'DEMO-MR-03';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["gift-sets"]'::jsonb) where sku = 'DEMO-GF-01';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["gift-sets"]'::jsonb) where sku = 'DEMO-GF-02';
update products set attributes = coalesce(attributes, '{}'::jsonb) || jsonb_build_object('tags', '["gift-cards"]'::jsonb) where sku = 'DEMO-GF-03';

insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00011', 'Гидрофильное масло для снятия макияжа', 'Dermalux', 'Очищение', 890, 'Бережно растворяет макияж и SPF.', 'Без отдушек, 150 мл', 'Все типы кожи', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Снятие макияжа","tags":["makeup-removal"],"volume":"150 мл","skinType":["dry","oily","combination","normal","sensitive"]}'::jsonb || jsonb_build_object('oldPrice', round(890 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N00011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00012', 'Бальзам-щербет для снятия макияжа', 'Seoul Skin', 'Очищение', 950, 'Бережно растворяет макияж и SPF.', 'Без отдушек, 100 мл', 'Все типы кожи', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Снятие макияжа","tags":["makeup-removal"],"volume":"100 мл","skinType":["dry","oily","combination","normal","sensitive"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N00012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00051', 'Альгинатная маска с гиалуроновой кислотой', 'Dermalux', 'Маски', 690, 'Интенсивный уход за 15 минут.', 'Без парабенов, 100 г', 'Все типы кожи', true, '/demo/photos/2bQ82FvUAFg.jpg', '{"productType":"Маски","tags":["mask"],"volume":"100 г","skinType":["dry","oily","combination","normal","sensitive"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N00051');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00061', 'Энзимная пудра для умывания', 'Seoul Skin', 'Уход за лицом', 760, 'Мягко обновляет кожу.', 'Без микропластика, 60 г', 'Тусклая кожа', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Скрабы и пилинги","tags":["scrub"],"volume":"60 г","skinType":["dry","oily","combination","normal","sensitive"]}'::jsonb || jsonb_build_object('oldPrice', round(760 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N00061');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00071', 'Пэды с ниацинамидом, 50 шт', 'Dermalux', 'Уход за лицом', 1090, 'Пропитанные пэды для быстрого ухода.', 'Без спирта, 50 шт', 'Все типы кожи', true, '/demo/photos/2bQ82FvUAFg.jpg', '{"productType":"Пэды","tags":["pad"],"volume":"50 шт","skinType":["dry","oily","combination","normal","sensitive"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N00071');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00101', 'Скраб для губ «Сахар»', 'Silk Lab', 'Уход за лицом', 380, 'Питание и защита губ.', 'Без отдушек, 15 г', 'Сухие губы', true, '/demo/photos/NnsqpLjiA94.jpg', '{"productType":"Для губ","tags":["lips"],"volume":"15 г","skinType":["dry","oily","combination","normal","sensitive"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N00101');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00131', 'Крем с ПДРН и коллагеном', 'Seoul Skin', 'Сыворотки', 1790, 'Восстановление и регенерация кожи.', 'ПДРН, 50 мл', 'Уставшая кожа', true, '/demo/photos/9PnU-U7V6YE.jpg', '{"productType":"Средства с ПДРН","tags":["pdrn"],"volume":"50 мл","skinType":["dry","oily","combination","normal","sensitive"],"hit":true}'::jsonb || jsonb_build_object('oldPrice', round(1790 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N00131');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00141', 'Микроигольная сыворотка «Shot»', 'Seoul Skin', 'Сыворотки', 1490, 'Микроиглы для глубокого воздействия.', 'Гиалуроновая кислота, 30 мл', 'Зрелая кожа', true, '/demo/photos/9PnU-U7V6YE.jpg', '{"productType":"Средства с микроиглами","tags":["microneedle"],"volume":"30 мл","skinType":["dry","oily","combination","normal","sensitive"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N00141');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N00161', 'Электрический массажёр для лица EMS', 'Jade Touch', 'Массажеры', 2490, 'Массаж для лимфодренажа и лифтинга.', 'Натуральный камень', 'Массаж лица', true, '/demo/photos/mSHRwz_FlLY.jpg', '{"productType":"Массажёры для лица","tags":["massage-face"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N00161');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01001', 'Гель для душа «Кокос и ваниль»', 'Silk Lab', 'Уход для тела', 450, 'Мягкое очищение и приятный аромат.', 'Без сульфатов, 400 мл', 'Ежедневный уход', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Гели для душа","tags":["body-shower"],"volume":"400 мл"}'::jsonb || jsonb_build_object('oldPrice', round(450 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01002', 'Гель для душа «Морской бриз»', 'Body Flow', 'Уход для тела', 420, 'Мягкое очищение и приятный аромат.', 'Без сульфатов, 400 мл', 'Ежедневный уход', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Гели для душа","tags":["body-shower"],"volume":"400 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01003', 'Гель-масло для душа «Миндаль»', 'Glow Co', 'Уход для тела', 620, 'Мягкое очищение и приятный аромат.', 'Без сульфатов, 250 мл', 'Ежедневный уход', true, '/demo/photos/Ui7QkgvUBZ0.jpg', '{"productType":"Гели для душа","tags":["body-shower"],"volume":"250 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01003');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01011', 'Сахарный скраб для тела «Апельсин»', 'Silk Lab', 'Уход для тела', 580, 'Отшелушивает и выравнивает кожу тела.', 'Натуральные абразивы, 250 г', 'Все типы кожи', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Скрабы и пилинги","tags":["body-scrub"],"volume":"250 г"}'::jsonb || jsonb_build_object('oldPrice', round(580 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01021', 'Питательный крем для тела «Ши»', 'Silk Lab', 'Уход для тела', 720, 'Питательный крем на целый день.', 'Масло ши, 250 мл', 'Сухая кожа тела', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Кремы для тела","tags":["body-cream"],"volume":"250 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01022', 'Крем-баттер для тела «Какао»', 'Glow Co', 'Уход для тела', 790, 'Питательный крем на целый день.', 'Масло ши, 200 мл', 'Сухая кожа тела', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Кремы для тела","tags":["body-cream"],"volume":"200 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01023', 'Лёгкий крем для тела с алоэ', 'Body Flow', 'Уход для тела', 560, 'Питательный крем на целый день.', 'Масло ши, 250 мл', 'Сухая кожа тела', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Кремы для тела","tags":["body-cream"],"volume":"250 мл"}'::jsonb || jsonb_build_object('oldPrice', round(560 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01023');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01031', 'Лосьон для тела с гиалуроновой кислотой', 'Glow Co', 'Уход для тела', 690, 'Быстро впитывается, не оставляет плёнки.', 'Глицерин, 300 мл', 'Ежедневный уход', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Лосьоны и молочко","tags":["body-lotion"],"volume":"300 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01041', 'Сухое масло для тела с шиммером', 'Glow Co', 'Уход для тела', 890, 'Питание и сияние кожи.', 'Натуральные масла, 100 мл', 'Тусклая кожа', true, '/demo/photos/9PnU-U7V6YE.jpg', '{"productType":"Масла для тела","tags":["body-oil"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01051', 'Дезодорант-стик «Свежесть»', 'Body Flow', 'Уход для тела', 380, 'Защита от запаха на 48 часов.', 'Без спирта, 50 г', 'Ежедневная защита', true, '/demo/photos/FXCsQsSer1c.jpg', '{"productType":"Дезодоранты","tags":["deodorant"],"volume":"50 г"}'::jsonb || jsonb_build_object('oldPrice', round(380 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01051');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01052', 'Роликовый антиперспирант «Sensitive»', 'Body Flow', 'Уход для тела', 420, 'Защита от запаха на 48 часов.', 'Без спирта, 50 мл', 'Ежедневная защита', true, '/demo/photos/pODoOEsYr_I.jpg', '{"productType":"Дезодоранты","tags":["deodorant"],"volume":"50 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01052');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01053', 'Кристаллический дезодорант', 'Silk Lab', 'Уход для тела', 460, 'Защита от запаха на 48 часов.', 'Без спирта, 60 г', 'Ежедневная защита', true, '/demo/photos/XanILp6v_Eg.jpg', '{"productType":"Дезодоранты","tags":["deodorant"],"volume":"60 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01053');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01061', 'Крем для рук «Ши и мёд»', 'Silk Lab', 'Уход для тела', 340, 'Защита и увлажнение кожи рук.', 'Пантенол, 75 мл', 'Сухая кожа рук', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Для рук","tags":["body-hands"],"volume":"75 мл","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(340 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01061');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01062', 'Маска-перчатки для рук', 'Seoul Skin', 'Уход для тела', 520, 'Защита и увлажнение кожи рук.', 'Пантенол, 1 пара', 'Сухая кожа рук', true, '/demo/photos/XanILp6v_Eg.jpg', '{"productType":"Для рук","tags":["body-hands"],"volume":"1 пара"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01062');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01071', 'Дезодорирующий спрей для ног', 'Body Flow', 'Уход для тела', 390, 'Смягчает и освежает кожу стоп.', 'Мочевина, 100 мл', 'Сухая кожа ног', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Для ног","tags":["body-feet"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01071');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01081', 'Антицеллюлитный скраб-гель', 'Body Flow', 'Уход для тела', 780, 'Разогревающий уход для проблемных зон.', 'Кофеин, 200 мл', 'Антицеллюлитный уход', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Антицеллюлитный уход","tags":["body-anticellulite"],"volume":"200 мл"}'::jsonb || jsonb_build_object('oldPrice', round(780 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01081');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01091', 'Солнцезащитное молочко для тела SPF 30', 'Sun Guard', 'SPF', 890, 'Водостойкая защита для тела.', 'SPF 50, 200 мл', 'Пляж и отпуск', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Защита от солнца","tags":["spf-body"],"volume":"200 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01091');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01092', 'Солнцезащитное масло-спрей SPF 15', 'Sun Guard', 'SPF', 1050, 'Водостойкая защита для тела.', 'SPF 50, 150 мл', 'Пляж и отпуск', true, '/demo/photos/XanILp6v_Eg.jpg', '{"productType":"Защита от солнца","tags":["spf-body"],"volume":"150 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01092');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01101', 'Роллер для тела «Валик»', 'Body Flow', 'Массажеры', 1190, 'Для расслабления мышц и тонуса.', 'Перезаряжаемый', 'Массаж тела', true, '/demo/photos/mSHRwz_FlLY.jpg', '{"productType":"Массажёры для тела","tags":["massage-body"]}'::jsonb || jsonb_build_object('oldPrice', round(1190 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N01101');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N01102', 'Скребок для массажа тела', 'Jade Touch', 'Массажеры', 760, 'Для расслабления мышц и тонуса.', 'Перезаряжаемый', 'Массаж тела', true, '/demo/photos/xwM61TPMlYk.jpg', '{"productType":"Массажёры для тела","tags":["massage-body"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N01102');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02031', 'Термозащитная сыворотка для волос', 'Hair Lab', 'Уход за волосами', 690, 'Несмываемый уход для блеска и защиты.', 'Аргановое масло, 100 мл', 'Тип волос: сухие', true, '/demo/photos/9PnU-U7V6YE.jpg', '{"productType":"Сыворотки и масла","tags":["hair-care"],"volume":"100 мл","hairType":["dry","damaged"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02041', 'Сухой шампунь «Fresh Root»', 'Pure Hair', 'Уход за волосами', 520, 'Свежесть волос без мытья.', 'Рисовый крахмал, 200 мл', 'Тип волос: жирные', true, '/demo/photos/pODoOEsYr_I.jpg', '{"productType":"Сухие шампуни","tags":["dry-shampoo"],"volume":"200 мл","hairType":["oily"]}'::jsonb || jsonb_build_object('oldPrice', round(520 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N02041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02042', 'Сухой шампунь для тёмных волос', 'Pure Hair', 'Уход за волосами', 540, 'Свежесть волос без мытья.', 'Рисовый крахмал, 200 мл', 'Тип волос: жирные', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Сухие шампуни","tags":["dry-shampoo"],"volume":"200 мл","hairType":["oily"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02043', 'Сухой шампунь-пудра', 'Hair Lab', 'Уход за волосами', 480, 'Свежесть волос без мытья.', 'Рисовый крахмал, 50 г', 'Тип волос: жирные', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Сухие шампуни","tags":["dry-shampoo"],"volume":"50 г","hairType":["oily"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02051', 'Гель для укладки сильной фиксации', 'Hair Lab', 'Уход за волосами', 420, 'Форма и фиксация без утяжеления.', 'Не склеивает, 150 мл', 'Тип волос: нормальные', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Укладка","tags":["styling"],"volume":"150 мл","hairType":["normal"]}'::jsonb || jsonb_build_object('oldPrice', round(420 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N02051');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02052', 'Мусс для объёма', 'Hair Lab', 'Уход за волосами', 460, 'Форма и фиксация без утяжеления.', 'Не склеивает, 200 мл', 'Тип волос: нормальные', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Укладка","tags":["styling"],"volume":"200 мл","hairType":["normal"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02052');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02053', 'Воск-паста для текстуры', 'Pure Hair', 'Уход за волосами', 510, 'Форма и фиксация без утяжеления.', 'Не склеивает, 75 мл', 'Тип волос: нормальные', true, '/demo/photos/Ui7QkgvUBZ0.jpg', '{"productType":"Укладка","tags":["styling"],"volume":"75 мл","hairType":["normal"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02053');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02061', 'Лак для волос сильной фиксации', 'Hair Lab', 'Уход за волосами', 480, 'Надёжная фиксация на весь день.', 'Не склеивает, 300 мл', 'Тип волос: нормальные', true, '/demo/photos/pODoOEsYr_I.jpg', '{"productType":"Лаки для волос","tags":["hairspray"],"volume":"300 мл","hairType":["normal"],"hit":true}'::jsonb || jsonb_build_object('oldPrice', round(480 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N02061');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02062', 'Лак-спрей с блеском', 'Pure Hair', 'Уход за волосами', 520, 'Надёжная фиксация на весь день.', 'Не склеивает, 250 мл', 'Тип волос: нормальные', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Лаки для волос","tags":["hairspray"],"volume":"250 мл","hairType":["normal"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02062');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02063', 'Текстурирующий спрей «Морская соль»', 'Pure Hair', 'Уход за волосами', 560, 'Надёжная фиксация на весь день.', 'Не склеивает, 200 мл', 'Тип волос: нормальные', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Лаки для волос","tags":["hairspray"],"volume":"200 мл","hairType":["normal"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02063');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02071', 'Крем-краска для волос, тон 7.1', 'Color Care', 'Уход за волосами', 640, 'Стойкий цвет и уход за окрашенными волосами.', 'С аммиаком/без, 100 мл', 'Тип волос: окрашенные', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Окрашивание","tags":["hair-color"],"volume":"100 мл","hairType":["colored"]}'::jsonb || jsonb_build_object('oldPrice', round(640 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N02071');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02072', 'Тонирующий бальзам «Пепельный блонд»', 'Color Care', 'Уход за волосами', 590, 'Стойкий цвет и уход за окрашенными волосами.', 'С аммиаком/без, 150 мл', 'Тип волос: окрашенные', true, '/demo/photos/2bQ82FvUAFg.jpg', '{"productType":"Окрашивание","tags":["hair-color"],"volume":"150 мл","hairType":["colored"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02072');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02073', 'Оттеночный шампунь против жёлтизны', 'Color Care', 'Уход за волосами', 610, 'Стойкий цвет и уход за окрашенными волосами.', 'С аммиаком/без, 250 мл', 'Тип волос: окрашенные', true, '/demo/photos/DNohKoNoKEk.jpg', '{"productType":"Окрашивание","tags":["hair-color"],"volume":"250 мл","hairType":["colored"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02073');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02081', 'Пилинг для кожи головы', 'Pure Hair', 'Уход за волосами', 780, 'Здоровая кожа головы и рост волос.', 'Пироктон оламин, 150 мл', 'Тип волос: жирные', true, '/demo/photos/9PnU-U7V6YE.jpg', '{"productType":"Уход за кожей головы","tags":["scalp"],"volume":"150 мл","hairType":["oily","normal"]}'::jsonb || jsonb_build_object('oldPrice', round(780 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N02081');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02082', 'Сыворотка против выпадения', 'Hair Lab', 'Уход за волосами', 1290, 'Здоровая кожа головы и рост волос.', 'Пироктон оламин, 100 мл', 'Тип волос: жирные', true, '/demo/photos/pd4rqJMd51Q.jpg', '{"productType":"Уход за кожей головы","tags":["scalp"],"volume":"100 мл","hairType":["oily","normal"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02082');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N02083', 'Тоник для кожи головы', 'Pure Hair', 'Уход за волосами', 690, 'Здоровая кожа головы и рост волос.', 'Пироктон оламин, 100 мл', 'Тип волос: жирные', true, '/demo/photos/LeWrouH2qto.jpg', '{"productType":"Уход за кожей головы","tags":["scalp"],"volume":"100 мл","hairType":["oily","normal"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N02083');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03001', 'Тональный крем «Silk Skin»', 'Velvet', 'Макияж', 980, 'Ровный тон и естественное покрытие.', 'SPF 15, 30 мл', 'На каждый день', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Тональные средства","tags":["foundation"],"volume":"30 мл"}'::jsonb || jsonb_build_object('oldPrice', round(980 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03002', 'Тональный флюид «Glow»', 'Nude Studio', 'Макияж', 1120, 'Ровный тон и естественное покрытие.', 'SPF 15, 30 мл', 'На каждый день', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Тональные средства","tags":["foundation"],"volume":"30 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03003', 'Тональный кушон «Cloud»', 'Lumi', 'Макияж', 1350, 'Ровный тон и естественное покрытие.', 'SPF 15, 15 г', 'На каждый день', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Тональные средства","tags":["foundation"],"volume":"15 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03003');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03011', 'Жидкий консилер «Bright»', 'Velvet', 'Макияж', 620, 'Маскирует круги и несовершенства.', 'Стойкий, 6 мл', 'Коррекция', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Консилеры","tags":["concealer"],"volume":"6 мл"}'::jsonb || jsonb_build_object('oldPrice', round(620 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03012', 'Консилер-карандаш', 'Nude Studio', 'Макияж', 540, 'Маскирует круги и несовершенства.', 'Стойкий, 3 г', 'Коррекция', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Консилеры","tags":["concealer"],"volume":"3 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03013', 'Кремовый консилер-палетка', 'Lumi', 'Макияж', 890, 'Маскирует круги и несовершенства.', 'Стойкий, 8 г', 'Коррекция', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Консилеры","tags":["concealer"],"volume":"8 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03013');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03021', 'Рассыпчатая пудра прозрачная', 'Velvet', 'Макияж', 690, 'Матовое покрытие на весь день.', 'Микропудра, 15 г', 'Фиксация макияжа', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Пудры","tags":["powder"],"volume":"15 г","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(690 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03022', 'Компактная пудра «Matte»', 'Nude Studio', 'Макияж', 740, 'Матовое покрытие на весь день.', 'Микропудра, 10 г', 'Фиксация макияжа', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Пудры","tags":["powder"],"volume":"10 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03023', 'Запечённая пудра с сиянием', 'Lumi', 'Макияж', 880, 'Матовое покрытие на весь день.', 'Микропудра, 9 г', 'Фиксация макияжа', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Пудры","tags":["powder"],"volume":"9 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03023');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03031', 'Румяна кремовые «Peach»', 'Velvet', 'Макияж', 620, 'Свежий румянец и сияние.', 'Пигментированные, 5 г', 'Макияж лица', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Румяна","tags":["blush"],"volume":"5 г"}'::jsonb || jsonb_build_object('oldPrice', round(620 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03032', 'Румяна пудровые «Rose»', 'Nude Studio', 'Макияж', 580, 'Свежий румянец и сияние.', 'Пигментированные, 6 г', 'Макияж лица', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Румяна","tags":["blush"],"volume":"6 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03033', 'Румяна-стик «Blush Up»', 'Lumi', 'Макияж', 650, 'Свежий румянец и сияние.', 'Пигментированные, 8 г', 'Макияж лица', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Румяна","tags":["blush"],"volume":"8 г","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03041', 'Бронзер «Sun Kissed»', 'Velvet', 'Макияж', 720, 'Контуринг и лёгкий загар.', 'Без апельсиновых пятен, 10 г', 'Контуринг', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Бронзеры и скульпторы","tags":["bronzer"],"volume":"10 г"}'::jsonb || jsonb_build_object('oldPrice', round(720 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03042', 'Скульптор-стик для контуринга', 'Nude Studio', 'Макияж', 690, 'Контуринг и лёгкий загар.', 'Без апельсиновых пятен, 9 г', 'Контуринг', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Бронзеры и скульпторы","tags":["bronzer"],"volume":"9 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03043', 'Палетка для контуринга', 'Lumi', 'Макияж', 980, 'Контуринг и лёгкий загар.', 'Без апельсиновых пятен, 12 г', 'Контуринг', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Бронзеры и скульпторы","tags":["bronzer"],"volume":"12 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03051', 'Хайлайтер «Pearl»', 'Velvet', 'Макияж', 690, 'Сияние на скулах и бровях.', 'Мелкий шиммер, 8 г', 'Макияж лица', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Хайлайтеры","tags":["highlighter"],"volume":"8 г"}'::jsonb || jsonb_build_object('oldPrice', round(690 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03051');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03052', 'Жидкий хайлайтер «Glow Drops»', 'Lumi', 'Макияж', 640, 'Сияние на скулах и бровях.', 'Мелкий шиммер, 15 мл', 'Макияж лица', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Хайлайтеры","tags":["highlighter"],"volume":"15 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03052');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03053', 'Хайлайтер-стик «Gold»', 'Nude Studio', 'Макияж', 620, 'Сияние на скулах и бровях.', 'Мелкий шиммер, 9 г', 'Макияж лица', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Хайлайтеры","tags":["highlighter"],"volume":"9 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03053');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03061', 'Праймер-основа под макияж', 'Velvet', 'Макияж', 780, 'Основа под макияж и фиксация.', 'Не забивает поры, 30 мл', 'Стойкость макияжа', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Праймеры и фиксаторы","tags":["primer"],"volume":"30 мл"}'::jsonb || jsonb_build_object('oldPrice', round(780 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03061');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03062', 'Фиксирующий спрей для макияжа', 'Nude Studio', 'Макияж', 720, 'Основа под макияж и фиксация.', 'Не забивает поры, 100 мл', 'Стойкость макияжа', true, '/demo/photos/A_ZiNBM1J5c.jpg', '{"productType":"Праймеры и фиксаторы","tags":["primer"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03062');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03063', 'Праймер-гель с эффектом сияния', 'Lumi', 'Макияж', 850, 'Основа под макияж и фиксация.', 'Не забивает поры, 30 мл', 'Стойкость макияжа', true, '/demo/photos/P_gQpl-a_R4.jpg', '{"productType":"Праймеры и фиксаторы","tags":["primer"],"volume":"30 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03063');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03071', 'Тушь для объёма «Big Eyes»', 'Velvet', 'Макияж', 640, 'Объём и подкручивание ресниц.', 'Водостойкая, 10 мл', 'Макияж глаз', true, '/demo/photos/5Us84s7blq8.jpg', '{"productType":"Тушь","tags":["mascara"],"volume":"10 мл","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(640 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03071');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03072', 'Тушь для длины «Long Lash»', 'Nude Studio', 'Макияж', 610, 'Объём и подкручивание ресниц.', 'Водостойкая, 10 мл', 'Макияж глаз', true, '/demo/photos/l3fh8RDxCvA.jpg', '{"productType":"Тушь","tags":["mascara"],"volume":"10 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03072');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03081', 'Палетка теней «Sunset», 9 цветов', 'Lumi', 'Макияж', 1190, 'Выразительный макияж глаз.', 'Пигментированные, 9 цветов', 'Макияж глаз', true, '/demo/photos/5Us84s7blq8.jpg', '{"productType":"Тени","tags":["eyeshadow"],"volume":"9 цветов"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03081');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03082', 'Моно-тени «Shimmer»', 'Velvet', 'Макияж', 380, 'Выразительный макияж глаз.', 'Пигментированные, 2 г', 'Макияж глаз', true, '/demo/photos/l3fh8RDxCvA.jpg', '{"productType":"Тени","tags":["eyeshadow"],"volume":"2 г"}'::jsonb || jsonb_build_object('oldPrice', round(380 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03082');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03091', 'Гелевый карандаш для глаз чёрный', 'Velvet', 'Макияж', 420, 'Чёткая линия и стойкий цвет.', 'Водостойкие, 1.2 г', 'Макияж глаз', true, '/demo/photos/5Us84s7blq8.jpg', '{"productType":"Карандаши и подводки","tags":["eyeliner"],"volume":"1.2 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03091');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03092', 'Жидкая подводка-фломастер', 'Nude Studio', 'Макияж', 480, 'Чёткая линия и стойкий цвет.', 'Водостойкие, 1 мл', 'Макияж глаз', true, '/demo/photos/l3fh8RDxCvA.jpg', '{"productType":"Карандаши и подводки","tags":["eyeliner"],"volume":"1 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03092');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03093', 'Каял для внутреннего века', 'Lumi', 'Макияж', 390, 'Чёткая линия и стойкий цвет.', 'Водостойкие, 1.4 г', 'Макияж глаз', true, '/demo/photos/PZ_-sCaBCaQ.jpg', '{"productType":"Карандаши и подводки","tags":["eyeliner"],"volume":"1.4 г"}'::jsonb || jsonb_build_object('oldPrice', round(390 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03093');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03101', 'Карандаш для бровей с щёточкой', 'Nude Studio', 'Макияж', 420, 'Форма и цвет бровей.', 'Стойкие, 0.3 г', 'Макияж бровей', true, '/demo/photos/5Us84s7blq8.jpg', '{"productType":"Брови","tags":["brows"],"volume":"0.3 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03101');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03102', 'Гель для фиксации бровей', 'Velvet', 'Макияж', 460, 'Форма и цвет бровей.', 'Стойкие, 6 мл', 'Макияж бровей', true, '/demo/photos/l3fh8RDxCvA.jpg', '{"productType":"Брови","tags":["brows"],"volume":"6 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03102');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03103', 'Помада для бровей', 'Lumi', 'Макияж', 590, 'Форма и цвет бровей.', 'Стойкие, 4 г', 'Макияж бровей', true, '/demo/photos/PZ_-sCaBCaQ.jpg', '{"productType":"Брови","tags":["brows"],"volume":"4 г"}'::jsonb || jsonb_build_object('oldPrice', round(590 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03103');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03111', 'Помада матовая «Nude»', 'Nude Studio', 'Макияж', 720, 'Стойкий цвет и комфорт.', 'Не сушит, 3.5 г', 'Макияж губ', true, '/demo/photos/NnsqpLjiA94.jpg', '{"productType":"Помады","tags":["lipstick"],"volume":"3.5 г","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03111');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03112', 'Помада кремовая «Berry»', 'Lumi', 'Макияж', 760, 'Стойкий цвет и комфорт.', 'Не сушит, 3.5 г', 'Макияж губ', true, '/demo/photos/mSHRwz_FlLY.jpg', '{"productType":"Помады","tags":["lipstick"],"volume":"3.5 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03112');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03121', 'Блеск для губ «Crystal»', 'Velvet', 'Макияж', 480, 'Блеск и питание губ.', 'Не липнет, 6 мл', 'Макияж губ', true, '/demo/photos/NnsqpLjiA94.jpg', '{"productType":"Блески и бальзамы","tags":["lipgloss"],"volume":"6 мл"}'::jsonb || jsonb_build_object('oldPrice', round(480 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03121');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03122', 'Тинт-бальзам для губ', 'Nude Studio', 'Макияж', 520, 'Блеск и питание губ.', 'Не липнет, 4 г', 'Макияж губ', true, '/demo/photos/mSHRwz_FlLY.jpg', '{"productType":"Блески и бальзамы","tags":["lipgloss"],"volume":"4 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03122');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03123', 'Масло для губ «Cherry»', 'Lumi', 'Макияж', 540, 'Блеск и питание губ.', 'Не липнет, 6 мл', 'Макияж губ', true, '/demo/photos/xwM61TPMlYk.jpg', '{"productType":"Блески и бальзамы","tags":["lipgloss"],"volume":"6 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03123');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03131', 'Лак для ногтей «Cherry»', 'Nude Studio', 'Макияж', 320, 'Яркий цвет и стойкое покрытие.', 'Без формальдегида, 10 мл', 'Маникюр', true, '/demo/photos/FqpSyjCdccw.jpg', '{"productType":"Лак для ногтей","tags":["nails"],"volume":"10 мл","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(320 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N03131');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03132', 'Гель-лак «Milk»', 'Lumi', 'Макияж', 380, 'Яркий цвет и стойкое покрытие.', 'Без формальдегида, 10 мл', 'Маникюр', true, '/demo/photos/MUVKrHNMvoQ.jpg', '{"productType":"Лак для ногтей","tags":["nails"],"volume":"10 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03132');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N03133', 'Закрепитель-топ с блеском', 'Velvet', 'Макияж', 340, 'Яркий цвет и стойкое покрытие.', 'Без формальдегида, 10 мл', 'Маникюр', true, '/demo/photos/S6crviGv5wY.jpg', '{"productType":"Лак для ногтей","tags":["nails"],"volume":"10 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N03133');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04001', 'Парфюмерная вода «Velvet Rose»', 'Maison Rose', 'Парфюм', 3400, 'Цветочно-фруктовые ароматы.', 'Стойкость 6–8 часов, 50 мл', 'Женский аромат', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Женская парфюмерия","tags":["perfume-women"],"volume":"50 мл"}'::jsonb || jsonb_build_object('oldPrice', round(3400 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N04001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04002', 'Парфюмерная вода «Pink Sky»', 'Maison Rose', 'Парфюм', 2900, 'Цветочно-фруктовые ароматы.', 'Стойкость 6–8 часов, 30 мл', 'Женский аромат', true, '/demo/photos/49c-5-bNCRk.jpg', '{"productType":"Женская парфюмерия","tags":["perfume-women"],"volume":"30 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04011', 'Туалетная вода «Cedar Wood»', 'Maison Rose', 'Парфюм', 3100, 'Древесные и свежие ароматы.', 'Стойкость 6–8 часов, 50 мл', 'Мужской аромат', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Мужская парфюмерия","tags":["perfume-men"],"volume":"50 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04012', 'Парфюмерная вода «Night Rider»', 'Maison Rose', 'Парфюм', 3600, 'Древесные и свежие ароматы.', 'Стойкость 6–8 часов, 50 мл', 'Мужской аромат', true, '/demo/photos/49c-5-bNCRk.jpg', '{"productType":"Мужская парфюмерия","tags":["perfume-men"],"volume":"50 мл"}'::jsonb || jsonb_build_object('oldPrice', round(3600 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N04012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04013', 'Туалетная вода «Aqua Sport»', 'Maison Rose', 'Парфюм', 2600, 'Древесные и свежие ароматы.', 'Стойкость 6–8 часов, 100 мл', 'Мужской аромат', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Мужская парфюмерия","tags":["perfume-men"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04013');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04021', 'Парфюмерная вода «Amber Musk»', 'Maison Rose', 'Парфюм', 3300, 'Универсальные ароматы.', 'Стойкость 5–7 часов, 50 мл', 'Унисекс', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Унисекс","tags":["perfume-unisex"],"volume":"50 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04022', 'Одеколон «Citrus Garden»', 'Maison Rose', 'Парфюм', 2200, 'Универсальные ароматы.', 'Стойкость 5–7 часов, 100 мл', 'Унисекс', true, '/demo/photos/49c-5-bNCRk.jpg', '{"productType":"Унисекс","tags":["perfume-unisex"],"volume":"100 мл"}'::jsonb || jsonb_build_object('oldPrice', round(2200 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N04022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04031', 'Набор миниатюр «Floral»', 'Maison Rose', 'Парфюм', 1900, 'Для знакомства с ароматами.', '3 аромата, 3 × 10 мл', 'Подарок или проба', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Наборы и миниатюры","tags":["perfume-set"],"volume":"3 × 10 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04032', 'Подарочный набор «Rose + крем»', 'Maison Rose', 'Парфюм', 3700, 'Для знакомства с ароматами.', '3 аромата, 50 мл + 75 мл', 'Подарок или проба', true, '/demo/photos/49c-5-bNCRk.jpg', '{"productType":"Наборы и миниатюры","tags":["perfume-set"],"volume":"50 мл + 75 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04041', 'Мист для тела «Vanilla Cloud»', 'Glow Co', 'Парфюм', 650, 'Лёгкий аромат на каждый день.', 'Без спирта, 150 мл', 'Ежедневный аромат', true, '/demo/photos/pODoOEsYr_I.jpg', '{"productType":"Мисты для тела и волос","tags":["mist"],"volume":"150 мл"}'::jsonb || jsonb_build_object('oldPrice', round(650 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N04041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04042', 'Мист для волос «Peony»', 'Hair Lab', 'Парфюм', 590, 'Лёгкий аромат на каждый день.', 'Без спирта, 100 мл', 'Ежедневный аромат', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Мисты для тела и волос","tags":["mist"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04043', 'Парфюмированный спрей «Cotton»', 'Glow Co', 'Парфюм', 620, 'Лёгкий аромат на каждый день.', 'Без спирта, 150 мл', 'Ежедневный аромат', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Мисты для тела и волос","tags":["mist"],"volume":"150 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04051', 'Масляные духи «Jasmine»', 'Maison Rose', 'Парфюм', 1290, 'Компактный аромат с собой.', 'Роллер, 10 мл', 'Ароматы в сумочку', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Масляные духи и роллеры","tags":["perfume-roll"],"volume":"10 мл","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(1290 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N04051');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04052', 'Роллер «Amber»', 'Maison Rose', 'Парфюм', 1190, 'Компактный аромат с собой.', 'Роллер, 10 мл', 'Ароматы в сумочку', true, '/demo/photos/49c-5-bNCRk.jpg', '{"productType":"Масляные духи и роллеры","tags":["perfume-roll"],"volume":"10 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04052');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N04053', 'Твёрдые духи «Wood»', 'Maison Rose', 'Парфюм', 990, 'Компактный аромат с собой.', 'Роллер, 8 г', 'Ароматы в сумочку', true, '/demo/photos/W_mMinc50k8.jpg', '{"productType":"Масляные духи и роллеры","tags":["perfume-roll"],"volume":"8 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N04053');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05001', 'Термальная вода-спрей', 'Derma Care', 'Аптечная косметика', 690, 'Гипоаллергенный уход.', 'Без отдушек, 150 мл', 'Чувствительная кожа', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Для чувствительной кожи","tags":["pharm-sensitive"],"volume":"150 мл","skinType":["sensitive","dry"]}'::jsonb || jsonb_build_object('oldPrice', round(690 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N05001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05011', 'Сыворотка против несовершенств', 'Derma Care', 'Аптечная косметика', 1190, 'Лечебный уход за проблемной кожей.', 'Цинк, 30 мл', 'Проблемная кожа', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Против акне","tags":["pharm-acne"],"volume":"30 мл","skinType":["sensitive","dry"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05012', 'Очищающий гель для проблемной кожи', 'Derma Care', 'Аптечная косметика', 890, 'Лечебный уход за проблемной кожей.', 'Цинк, 200 мл', 'Проблемная кожа', true, '/demo/photos/XanILp6v_Eg.jpg', '{"productType":"Против акне","tags":["pharm-acne"],"volume":"200 мл","skinType":["sensitive","dry"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05021', 'Бальзам «Спасатель»', 'Derma Care', 'Аптечная косметика', 780, 'Восстановление барьера кожи.', 'Церамиды, 40 мл', 'Раздражённая кожа', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Восстанавливающие","tags":["pharm-repair"],"volume":"40 мл","skinType":["sensitive","dry"]}'::jsonb || jsonb_build_object('oldPrice', round(780 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N05021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05022', 'Крем-барьер с цинком', 'Derma Care', 'Аптечная косметика', 690, 'Восстановление барьера кожи.', 'Церамиды, 100 мл', 'Раздражённая кожа', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Восстанавливающие","tags":["pharm-repair"],"volume":"100 мл","skinType":["sensitive","dry"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05031', 'Комплекс «Волосы, кожа, ногти»', 'Derma Care', 'Аптечная косметика', 1190, 'Поддержка кожи, волос и ногтей изнутри.', '60 капсул, 60 шт', 'Красота изнутри', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Витамины красоты","tags":["pharm-vitamins"],"volume":"60 шт","skinType":["sensitive","dry"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05032', 'Коллаген с витамином C', 'Derma Care', 'Аптечная косметика', 1690, 'Поддержка кожи, волос и ногтей изнутри.', '60 капсул, 30 саше', 'Красота изнутри', true, '/demo/photos/2bQ82FvUAFg.jpg', '{"productType":"Витамины красоты","tags":["pharm-vitamins"],"volume":"30 саше","skinType":["sensitive","dry"]}'::jsonb || jsonb_build_object('oldPrice', round(1690 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N05032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05033', 'Омега-3 для кожи', 'Derma Care', 'Аптечная косметика', 990, 'Поддержка кожи, волос и ногтей изнутри.', '60 капсул, 90 капсул', 'Красота изнутри', true, '/demo/photos/DNohKoNoKEk.jpg', '{"productType":"Витамины красоты","tags":["pharm-vitamins"],"volume":"90 капсул","skinType":["sensitive","dry"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05041', 'Шампунь против перхоти', 'Derma Care', 'Аптечная косметика', 790, 'Терапевтический уход за волосами.', 'Клинически проверено, 200 мл', 'Выпадение и перхоть', true, '/demo/photos/YwgaLtnYX4k.jpg', '{"productType":"Для проблем с волосами","tags":["pharm-hair"],"volume":"200 мл","skinType":["sensitive","dry"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05042', 'Лосьон против выпадения', 'Derma Care', 'Аптечная косметика', 1390, 'Терапевтический уход за волосами.', 'Клинически проверено, 100 мл', 'Выпадение и перхоть', true, '/demo/photos/Ui7QkgvUBZ0.jpg', '{"productType":"Для проблем с волосами","tags":["pharm-hair"],"volume":"100 мл","skinType":["sensitive","dry"]}'::jsonb || jsonb_build_object('oldPrice', round(1390 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N05042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N05043', 'Ампулы для роста волос', 'Derma Care', 'Аптечная косметика', 1590, 'Терапевтический уход за волосами.', 'Клинически проверено, 10 × 10 мл', 'Выпадение и перхоть', true, '/demo/photos/m3rBOi881fo.jpg', '{"productType":"Для проблем с волосами","tags":["pharm-hair"],"volume":"10 × 10 мл","skinType":["sensitive","dry"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N05043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06001', 'Прокладки ночные, 12 шт', 'Soft Day', 'Личная гигиена', 290, 'Комфорт в критические дни.', 'Дышащие, 12 шт', 'Критические дни', true, '/demo/photos/cxAZxTuL7Sk.jpg', '{"productType":"Прокладки и тампоны","tags":["hyg-pads"],"volume":"12 шт"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06011', 'Салфетки для интимной гигиены', 'Soft Day', 'Личная гигиена', 260, 'Мягкий уход с нейтральным pH.', 'pH 4.5, 20 шт', 'Ежедневный уход', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Интимная гигиена","tags":["hyg-intimate"],"volume":"20 шт","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(260 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N06011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06012', 'Пенка для интимной гигиены', 'Soft Day', 'Личная гигиена', 520, 'Мягкий уход с нейтральным pH.', 'pH 4.5, 150 мл', 'Ежедневный уход', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Интимная гигиена","tags":["hyg-intimate"],"volume":"150 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06021', 'Зубная паста отбеливающая', 'Pure Wash', 'Личная гигиена', 320, 'Здоровье зубов и свежее дыхание.', 'С фтором, 100 мл', 'Ежедневный уход', true, '/demo/photos/ED3F5UhUv5s.jpg', '{"productType":"Уход за полостью рта","tags":["hyg-oral"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06022', 'Зубная щётка мягкая', 'Pure Wash', 'Личная гигиена', 180, 'Здоровье зубов и свежее дыхание.', 'С фтором, 1 шт', 'Ежедневный уход', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Уход за полостью рта","tags":["hyg-oral"],"volume":"1 шт"}'::jsonb || jsonb_build_object('oldPrice', round(180 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N06022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06023', 'Ополаскиватель для рта', 'Pure Wash', 'Личная гигиена', 350, 'Здоровье зубов и свежее дыхание.', 'С фтором, 250 мл', 'Ежедневный уход', true, '/demo/photos/Ui7QkgvUBZ0.jpg', '{"productType":"Уход за полостью рта","tags":["hyg-oral"],"volume":"250 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06023');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06031', 'Бритвенный станок женский', 'Soft Day', 'Личная гигиена', 420, 'Гладкое бритьё без раздражения.', 'Без спирта, 1 шт', 'Бритьё', true, '/demo/photos/CbyN1eWQyS8.jpg', '{"productType":"Бритьё","tags":["hyg-shaving"],"volume":"1 шт","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06032', 'Пена для бритья', 'Soft Day', 'Личная гигиена', 360, 'Гладкое бритьё без раздражения.', 'Без спирта, 200 мл', 'Бритьё', true, '/demo/photos/FXCsQsSer1c.jpg', '{"productType":"Бритьё","tags":["hyg-shaving"],"volume":"200 мл"}'::jsonb || jsonb_build_object('oldPrice', round(360 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N06032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06033', 'Лосьон после бритья', 'Soft Day', 'Личная гигиена', 390, 'Гладкое бритьё без раздражения.', 'Без спирта, 100 мл', 'Бритьё', true, '/demo/photos/CbyN1eWQyS8.jpg', '{"productType":"Бритьё","tags":["hyg-shaving"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06041', 'Сахарная паста для шугаринга', 'Soft Day', 'Личная гигиена', 690, 'Гладкая кожа надолго.', 'Сахарная паста, 300 г', 'Депиляция', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Депиляция","tags":["hyg-depil"],"volume":"300 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06042', 'Полоски для депиляции, 20 шт', 'Soft Day', 'Личная гигиена', 420, 'Гладкая кожа надолго.', 'Сахарная паста, 20 шт', 'Депиляция', true, '/demo/photos/2bQ82FvUAFg.jpg', '{"productType":"Депиляция","tags":["hyg-depil"],"volume":"20 шт"}'::jsonb || jsonb_build_object('oldPrice', round(420 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N06042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N06043', 'Крем для депиляции', 'Soft Day', 'Личная гигиена', 450, 'Гладкая кожа надолго.', 'Сахарная паста, 100 мл', 'Депиляция', true, '/demo/photos/DNohKoNoKEk.jpg', '{"productType":"Депиляция","tags":["hyg-depil"],"volume":"100 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N06043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07001', 'Комплект «Кружево»', 'Lace & Co', 'Нижнее бельё', 2190, 'Бюстгальтер и трусики в одном стиле.', 'Мягкое кружево', 'Комплект', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Комплекты белья","tags":["uw-sets"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07002', 'Комплект «Хлопок»', 'Lace & Co', 'Нижнее бельё', 1590, 'Бюстгальтер и трусики в одном стиле.', 'Мягкое кружево', 'Комплект', true, '/demo/photos/AdjyrNhFVPI.jpg', '{"productType":"Комплекты белья","tags":["uw-sets"]}'::jsonb || jsonb_build_object('oldPrice', round(1590 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N07002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07011', 'Бюстгальтер с косточками «Classic»', 'Lace & Co', 'Нижнее бельё', 1490, 'Комфорт и поддержка.', 'Без косточек', 'Повседневный', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Бюстгальтеры","tags":["uw-bras"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07012', 'Бралетт «Soft»', 'Lace & Co', 'Нижнее бельё', 990, 'Комфорт и поддержка.', 'Без косточек', 'Повседневный', true, '/demo/photos/AdjyrNhFVPI.jpg', '{"productType":"Бюстгальтеры","tags":["uw-bras"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07021', 'Трусики-бразилиана', 'Lace & Co', 'Нижнее бельё', 490, 'Комфортное бельё на каждый день.', 'Хлопок', 'Повседневные', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Трусики","tags":["uw-briefs"],"hit":true}'::jsonb || jsonb_build_object('oldPrice', round(490 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N07021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07022', 'Трусики-слипы, набор 3 шт', 'Lace & Co', 'Нижнее бельё', 890, 'Комфортное бельё на каждый день.', 'Хлопок, 3 шт', 'Повседневные', true, '/demo/photos/AdjyrNhFVPI.jpg', '{"productType":"Трусики","tags":["uw-briefs"],"volume":"3 шт"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07031', 'Пижама «Шёлк»', 'Lace & Co', 'Нижнее бельё', 2490, 'Мягкая одежда для дома и сна.', 'Вискоза', 'Дом и сон', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Домашняя одежда","tags":["uw-sleep"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07032', 'Халат махровый', 'Lace & Co', 'Нижнее бельё', 2190, 'Мягкая одежда для дома и сна.', 'Вискоза', 'Дом и сон', true, '/demo/photos/AdjyrNhFVPI.jpg', '{"productType":"Домашняя одежда","tags":["uw-sleep"]}'::jsonb || jsonb_build_object('oldPrice', round(2190 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N07032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07033', 'Сорочка «Нежность»', 'Lace & Co', 'Нижнее бельё', 1490, 'Мягкая одежда для дома и сна.', 'Вискоза', 'Дом и сон', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Домашняя одежда","tags":["uw-sleep"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07041', 'Колготки 40 den', 'Lace & Co', 'Нижнее бельё', 390, 'Комфорт и стиль на каждый день.', 'Эластичные', 'Повседневные', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Носки и колготки","tags":["uw-hosiery"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07042', 'Носки хлопковые, набор 5 пар', 'Lace & Co', 'Нижнее бельё', 420, 'Комфорт и стиль на каждый день.', 'Эластичные, 5 пар', 'Повседневные', true, '/demo/photos/AdjyrNhFVPI.jpg', '{"productType":"Носки и колготки","tags":["uw-hosiery"],"volume":"5 пар"}'::jsonb || jsonb_build_object('oldPrice', round(420 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N07042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07043', 'Чулки с кружевом', 'Lace & Co', 'Нижнее бельё', 690, 'Комфорт и стиль на каждый день.', 'Эластичные', 'Повседневные', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Носки и колготки","tags":["uw-hosiery"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07051', 'Купальник слитный «Wave»', 'Lace & Co', 'Нижнее бельё', 2390, 'Для пляжа и бассейна.', 'Быстросохнущие', 'Пляж', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Купальники","tags":["uw-swim"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07051');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07052', 'Раздельный купальник «Coral»', 'Lace & Co', 'Нижнее бельё', 2190, 'Для пляжа и бассейна.', 'Быстросохнущие', 'Пляж', true, '/demo/photos/AdjyrNhFVPI.jpg', '{"productType":"Купальники","tags":["uw-swim"]}'::jsonb || jsonb_build_object('oldPrice', round(2190 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N07052');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N07053', 'Парео пляжное', 'Lace & Co', 'Нижнее бельё', 1190, 'Для пляжа и бассейна.', 'Быстросохнущие', 'Пляж', true, '/demo/photos/Z00Dhp_tk38.jpg', '{"productType":"Купальники","tags":["uw-swim"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N07053');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08001', 'Жидкое мыло «Цитрус»', 'Pure Wash', 'Мыломоющие средства', 240, 'Мягко очищает руки.', 'Без сульфатов, 500 мл', 'Ежедневное', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Жидкое мыло","tags":["soap-liquid"],"volume":"500 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N08001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08002', 'Жидкое мыло «Алоэ»', 'Pure Wash', 'Мыломоющие средства', 250, 'Мягко очищает руки.', 'Без сульфатов, 500 мл', 'Ежедневное', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Жидкое мыло","tags":["soap-liquid"],"volume":"500 мл"}'::jsonb || jsonb_build_object('oldPrice', round(250 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N08002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08011', 'Гель для душа «Мята»', 'Pure Wash', 'Мыломоющие средства', 380, 'Освежающее очищение.', 'pH-баланс, 400 мл', 'Ежедневное', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Гели для душа","tags":["soap-shower"],"volume":"400 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N08011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08012', 'Гель для душа «Лаванда»', 'Pure Wash', 'Мыломоющие средства', 390, 'Освежающее очищение.', 'pH-баланс, 400 мл', 'Ежедневное', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Гели для душа","tags":["soap-shower"],"volume":"400 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N08012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08021', 'Мыло «Лаванда и мёд»', 'Pure Wash', 'Мыломоющие средства', 220, 'Натуральное мыло ручной работы.', 'Натуральный состав, 100 г', 'Ручной уход', true, '/demo/photos/cxAZxTuL7Sk.jpg', '{"productType":"Твёрдое мыло","tags":["soap-bar"],"volume":"100 г","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(220 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N08021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08022', 'Мыло «Апельсин»', 'Pure Wash', 'Мыломоющие средства', 210, 'Натуральное мыло ручной работы.', 'Натуральный состав, 100 г', 'Ручной уход', true, '/demo/photos/QeIUZMA2mdU.jpg', '{"productType":"Твёрдое мыло","tags":["soap-bar"],"volume":"100 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N08022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08031', 'Соль для ванны «Лаванда»', 'Pure Wash', 'Мыломоющие средства', 380, 'Расслабляющая ванна.', 'Морская соль, 500 г', 'Релакс', true, '/demo/photos/cxAZxTuL7Sk.jpg', '{"productType":"Пена и соли для ванны","tags":["soap-bath"],"volume":"500 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N08031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08032', 'Пена для ванны «Ваниль»', 'Pure Wash', 'Мыломоющие средства', 420, 'Расслабляющая ванна.', 'Морская соль, 500 мл', 'Релакс', true, '/demo/photos/QeIUZMA2mdU.jpg', '{"productType":"Пена и соли для ванны","tags":["soap-bath"],"volume":"500 мл"}'::jsonb || jsonb_build_object('oldPrice', round(420 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N08032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N08033', 'Бомбочка для ванны', 'Pure Wash', 'Мыломоющие средства', 190, 'Расслабляющая ванна.', 'Морская соль, 120 г', 'Релакс', true, '/demo/photos/nl3uvcm1w5M.jpg', '{"productType":"Пена и соли для ванны","tags":["soap-bath"],"volume":"120 г"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N08033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09001', 'Ароматическая свеча «Сандал»', 'Cozy', 'Для дома', 790, 'Аромат и уют в доме.', 'Соевый воск, 200 г', 'Уют и подарок', true, '/demo/photos/2QSsfflO51I.jpg', '{"productType":"Свечи","tags":["home-candles"],"volume":"200 г","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N09001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09002', 'Свеча «Морской бриз»', 'Cozy', 'Для дома', 760, 'Аромат и уют в доме.', 'Соевый воск, 200 г', 'Уют и подарок', true, '/demo/photos/n8BjsYWTH8w.jpg', '{"productType":"Свечи","tags":["home-candles"],"volume":"200 г"}'::jsonb || jsonb_build_object('oldPrice', round(760 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N09002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09011', 'Диффузор «Белый чай»', 'Cozy', 'Для дома', 1190, 'Постоянный аромат в комнате.', 'С палочками, 100 мл', 'Ароматизация дома', true, '/demo/photos/2QSsfflO51I.jpg', '{"productType":"Диффузоры","tags":["home-diffusers"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N09011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09012', 'Диффузор «Лимонная трава»', 'Cozy', 'Для дома', 1150, 'Постоянный аромат в комнате.', 'С палочками, 100 мл', 'Ароматизация дома', true, '/demo/photos/n8BjsYWTH8w.jpg', '{"productType":"Диффузоры","tags":["home-diffusers"],"volume":"100 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N09012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09021', 'Спрей для подушек «Лаванда»', 'Cozy', 'Для дома', 520, 'Освежает воздух и ткани.', 'Без спирта, 150 мл', 'Свежесть в доме', true, '/demo/photos/pODoOEsYr_I.jpg', '{"productType":"Спреи для дома и текстиля","tags":["home-textile"],"volume":"150 мл"}'::jsonb || jsonb_build_object('oldPrice', round(520 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N09021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09022', 'Освежитель воздуха «Хлопок»', 'Cozy', 'Для дома', 460, 'Освежает воздух и ткани.', 'Без спирта, 250 мл', 'Свежесть в доме', true, '/demo/photos/20h-C0vaNBA.jpg', '{"productType":"Спреи для дома и текстиля","tags":["home-textile"],"volume":"250 мл","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N09022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09031', 'Подставка для свечи', 'Cozy', 'Для дома', 390, 'Мелочи для уюта.', 'Натуральные материалы', 'Декор', true, '/demo/photos/2QSsfflO51I.jpg', '{"productType":"Декор и аксессуары","tags":["home-decor"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N09031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09032', 'Аромасаше «Лаванда»', 'Cozy', 'Для дома', 290, 'Мелочи для уюта.', 'Натуральные материалы', 'Декор', true, '/demo/photos/n8BjsYWTH8w.jpg', '{"productType":"Декор и аксессуары","tags":["home-decor"]}'::jsonb || jsonb_build_object('oldPrice', round(290 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N09032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N09033', 'Набор спичек в банке', 'Cozy', 'Для дома', 260, 'Мелочи для уюта.', 'Натуральные материалы', 'Декор', true, '/demo/photos/7JxP1pYYIUo.jpg', '{"productType":"Декор и аксессуары","tags":["home-decor"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N09033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10001', 'Детское молочко для тела', 'Little Bloom', 'Для детей', 420, 'Нежный уход с рождения.', 'Гипоаллергенно, 250 мл', 'С рождения', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Уход за малышом","tags":["kids-care"],"volume":"250 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10002', 'Детское масло для массажа', 'Little Bloom', 'Для детей', 460, 'Нежный уход с рождения.', 'Гипоаллергенно, 150 мл', 'С рождения', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Уход за малышом","tags":["kids-care"],"volume":"150 мл","hit":true}'::jsonb || jsonb_build_object('oldPrice', round(460 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N10002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10011', 'Детский гель для купания', 'Little Bloom', 'Для детей', 380, 'Мягкое купание без слёз.', 'Без слёз, 400 мл', 'С рождения', true, '/demo/photos/YwgaLtnYX4k.jpg', '{"productType":"Купание и шампуни","tags":["kids-wash"],"volume":"400 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10012', 'Детская пена для ванны', 'Little Bloom', 'Для детей', 350, 'Мягкое купание без слёз.', 'Без слёз, 300 мл', 'С рождения', true, '/demo/photos/Ui7QkgvUBZ0.jpg', '{"productType":"Купание и шампуни","tags":["kids-wash"],"volume":"300 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10021', 'Детская зубная щётка мягкая', 'Little Bloom', 'Для детей', 190, 'Первые зубки под защитой.', 'Без фтора, 1 шт', 'От 1 года', true, '/demo/photos/ED3F5UhUv5s.jpg', '{"productType":"Гигиена полости рта","tags":["kids-oral"],"volume":"1 шт"}'::jsonb || jsonb_build_object('oldPrice', round(190 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N10021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10022', 'Гель для дёсен при прорезывании', 'Little Bloom', 'Для детей', 350, 'Первые зубки под защитой.', 'Без фтора, 15 мл', 'От 1 года', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Гигиена полости рта","tags":["kids-oral"],"volume":"15 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10031', 'Подгузники размер 3, 50 шт', 'Little Bloom', 'Для детей', 1290, 'Сухо и комфортно.', 'Гипоаллергенные, 50 шт', 'С рождения', true, '/demo/photos/UYJTgxZtUmk.jpg', '{"productType":"Подгузники и салфетки","tags":["kids-diapers"],"volume":"50 шт","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10032', 'Детские влажные салфетки, 72 шт', 'Little Bloom', 'Для детей', 260, 'Сухо и комфортно.', 'Гипоаллергенные, 72 шт', 'С рождения', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Подгузники и салфетки","tags":["kids-diapers"],"volume":"72 шт"}'::jsonb || jsonb_build_object('oldPrice', round(260 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N10032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10033', 'Трусики-подгузники размер 4', 'Little Bloom', 'Для детей', 1390, 'Сухо и комфортно.', 'Гипоаллергенные, 44 шт', 'С рождения', true, '/demo/photos/omY18KP7_Cw.jpg', '{"productType":"Подгузники и салфетки","tags":["kids-diapers"],"volume":"44 шт"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10041', 'Погремушка деревянная', 'Little Bloom', 'Для детей', 350, 'Безопасные игрушки для малышей.', 'Натуральное дерево', 'От 6 месяцев', true, '/demo/photos/ED3F5UhUv5s.jpg', '{"productType":"Игрушки и аксессуары","tags":["kids-toys"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10042', 'Прорезыватель силиконовый', 'Little Bloom', 'Для детей', 290, 'Безопасные игрушки для малышей.', 'Натуральное дерево', 'От 6 месяцев', true, '/demo/photos/lpFTFW9BZSU.jpg', '{"productType":"Игрушки и аксессуары","tags":["kids-toys"]}'::jsonb || jsonb_build_object('oldPrice', round(290 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N10042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N10043', 'Кубики мягкие, 6 шт', 'Little Bloom', 'Для детей', 590, 'Безопасные игрушки для малышей.', 'Натуральное дерево, 6 шт', 'От 6 месяцев', true, '/demo/photos/Ui7QkgvUBZ0.jpg', '{"productType":"Игрушки и аксессуары","tags":["kids-toys"],"volume":"6 шт","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N10043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11001', 'Щётка-расчёска «Wet Brush»', 'Style Kit', 'Аксессуары', 490, 'Бережное расчёсывание.', 'Не электризует', 'Ежедневное', true, '/demo/photos/b_wK7JiEny8.jpg', '{"productType":"Расчёски и щётки","tags":["acc-brushes"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11002', 'Гребень деревянный', 'Style Kit', 'Аксессуары', 320, 'Бережное расчёсывание.', 'Не электризует', 'Ежедневное', true, '/demo/photos/rO20Sn1FWo4.jpg', '{"productType":"Расчёски и щётки","tags":["acc-brushes"]}'::jsonb || jsonb_build_object('oldPrice', round(320 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N11002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11011', 'Заколки-крабы, 3 шт', 'Style Kit', 'Аксессуары', 280, 'Не портят волосы.', 'Мягкие, 3 шт', 'Ежедневное', true, '/demo/photos/b_wK7JiEny8.jpg', '{"productType":"Резинки и заколки","tags":["acc-hair"],"volume":"3 шт"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11012', 'Ободок для умывания', 'Style Kit', 'Аксессуары', 320, 'Не портят волосы.', 'Мягкие', 'Ежедневное', true, '/demo/photos/rO20Sn1FWo4.jpg', '{"productType":"Резинки и заколки","tags":["acc-hair"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11021', 'Косметичка-органайзер', 'Style Kit', 'Аксессуары', 990, 'Удобное хранение косметики.', 'Водоотталкивающие', 'Хранение', true, '/demo/photos/b_wK7JiEny8.jpg', '{"productType":"Косметички","tags":["acc-bags"],"hit":true}'::jsonb || jsonb_build_object('oldPrice', round(990 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N11021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11022', 'Дорожная косметичка', 'Style Kit', 'Аксессуары', 690, 'Удобное хранение косметики.', 'Водоотталкивающие', 'Хранение', true, '/demo/photos/rO20Sn1FWo4.jpg', '{"productType":"Косметички","tags":["acc-bags"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11031', 'Набор кистей для макияжа, 12 шт', 'Style Kit', 'Аксессуары', 1590, 'Инструменты для макияжа.', 'Синтетический ворс, 12 шт', 'Макияж', true, '/demo/photos/9QSXCwqc-u4.jpg', '{"productType":"Кисти и спонжи","tags":["acc-tools"],"volume":"12 шт"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11032', 'Спонж для тона', 'Style Kit', 'Аксессуары', 260, 'Инструменты для макияжа.', 'Синтетический ворс', 'Макияж', true, '/demo/photos/LI_lEhTifRg.jpg', '{"productType":"Кисти и спонжи","tags":["acc-tools"]}'::jsonb || jsonb_build_object('oldPrice', round(260 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N11032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11033', 'Кисть для румян', 'Style Kit', 'Аксессуары', 390, 'Инструменты для макияжа.', 'Синтетический ворс', 'Макияж', true, '/demo/photos/yd3mg93Smn8.jpg', '{"productType":"Кисти и спонжи","tags":["acc-tools"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11041', 'Зеркало карманное', 'Style Kit', 'Аксессуары', 290, 'Компактные зеркала.', 'Увеличение x5', 'Макияж', true, '/demo/photos/b_wK7JiEny8.jpg', '{"productType":"Зеркала","tags":["acc-mirrors"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11041');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11042', 'Зеркало с подсветкой', 'Style Kit', 'Аксессуары', 1290, 'Компактные зеркала.', 'Увеличение x5', 'Макияж', true, '/demo/photos/rO20Sn1FWo4.jpg', '{"productType":"Зеркала","tags":["acc-mirrors"]}'::jsonb || jsonb_build_object('oldPrice', round(1290 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N11042');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N11043', 'Зеркало настольное', 'Style Kit', 'Аксессуары', 690, 'Компактные зеркала.', 'Увеличение x5', 'Макияж', true, '/demo/photos/I7C5S7868Jk.jpg', '{"productType":"Зеркала","tags":["acc-mirrors"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N11043');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12001', 'Шоппер «Beauty Pink»', 'Merch', 'Мерч', 490, 'Фирменные сумки.', 'Плотный хлопок', 'Фирменный мерч', true, '/demo/photos/TeD4qZjGIMw.jpg', '{"productType":"Сумки и шопперы","tags":["merch-bags"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N12001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12002', 'Косметичка-клатч с логотипом', 'Merch', 'Мерч', 590, 'Фирменные сумки.', 'Плотный хлопок', 'Фирменный мерч', true, '/demo/photos/AJsdrXaRhHk.jpg', '{"productType":"Сумки и шопперы","tags":["merch-bags"]}'::jsonb || jsonb_build_object('oldPrice', round(590 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N12002');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12011', 'Футболка оверсайз', 'Merch', 'Мерч', 1490, 'Мягкая фирменная одежда.', 'Хлопок 80%', 'Фирменный мерч', true, '/demo/photos/TeD4qZjGIMw.jpg', '{"productType":"Одежда","tags":["merch-clothing"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N12011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12012', 'Свитшот «Beauty»', 'Merch', 'Мерч', 2490, 'Мягкая фирменная одежда.', 'Хлопок 80%', 'Фирменный мерч', true, '/demo/photos/AJsdrXaRhHk.jpg', '{"productType":"Одежда","tags":["merch-clothing"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N12012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12021', 'Кружка «Pink»', 'Merch', 'Мерч', 420, 'Для дома и работы.', 'Керамика, 350 мл', 'Фирменный мерч', true, '/demo/photos/TeD4qZjGIMw.jpg', '{"productType":"Кружки и бутылки","tags":["merch-mugs"],"volume":"350 мл"}'::jsonb || jsonb_build_object('oldPrice', round(420 * 2.0 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N12021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12022', 'Термобутылка', 'Merch', 'Мерч', 990, 'Для дома и работы.', 'Керамика, 500 мл', 'Фирменный мерч', true, '/demo/photos/AJsdrXaRhHk.jpg', '{"productType":"Кружки и бутылки","tags":["merch-mugs"],"volume":"500 мл"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N12022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12031', 'Блокнот «Beauty»', 'Merch', 'Мерч', 290, 'Приятные мелочи.', 'Бумага 120 г', 'Фирменный мерч', true, '/demo/photos/TeD4qZjGIMw.jpg', '{"productType":"Канцелярия и стикеры","tags":["merch-stationery"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N12031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12032', 'Набор стикеров', 'Merch', 'Мерч', 150, 'Приятные мелочи.', 'Бумага 120 г', 'Фирменный мерч', true, '/demo/photos/AJsdrXaRhHk.jpg', '{"productType":"Канцелярия и стикеры","tags":["merch-stationery"],"hit":true}'::jsonb || jsonb_build_object('oldPrice', round(150 * 1.6 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N12032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N12033', 'Ручка розовая', 'Merch', 'Мерч', 120, 'Приятные мелочи.', 'Бумага 120 г', 'Фирменный мерч', true, '/demo/photos/g5GXUqF_QDI.jpg', '{"productType":"Канцелярия и стикеры","tags":["merch-stationery"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N12033');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13001', 'Набор «Расслабление»', 'Gift Box', 'Подарки', 2290, 'Готовый подарок в красивой коробке.', 'Подарочная упаковка, 4 продукта', 'Подарок', true, '/demo/photos/ZLTlHeKbh04.jpg', '{"productType":"Подарочные наборы","tags":["gift-sets"],"volume":"4 продукта"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N13001');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13011', 'Сертификат 1000', 'Gift Box', 'Подарки', 1000, 'Сертификат на любую сумму.', 'Электронный', 'Подарок', true, '/demo/photos/ZLTlHeKbh04.jpg', '{"productType":"Подарочные сертификаты","tags":["gift-cards"]}'::jsonb || jsonb_build_object('oldPrice', round(1000 * 2.2 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N13011');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13012', 'Сертификат 3000', 'Gift Box', 'Подарки', 3000, 'Сертификат на любую сумму.', 'Электронный', 'Подарок', true, '/demo/photos/f94JPVrDbnY.jpg', '{"productType":"Подарочные сертификаты","tags":["gift-cards"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N13012');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13021', 'Подарочная коробка розовая', 'Gift Box', 'Подарки', 390, 'Оформление подарка.', 'Плотная бумага', 'Упаковка', true, '/demo/photos/ZLTlHeKbh04.jpg', '{"productType":"Упаковка","tags":["gift-wrap"],"hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N13021');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13022', 'Крафт-пакет с лентой', 'Gift Box', 'Подарки', 190, 'Оформление подарка.', 'Плотная бумага', 'Упаковка', true, '/demo/photos/f94JPVrDbnY.jpg', '{"productType":"Упаковка","tags":["gift-wrap"]}'::jsonb || jsonb_build_object('oldPrice', round(190 * 1.8 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N13022');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13023', 'Набор для упаковки подарка', 'Gift Box', 'Подарки', 490, 'Оформление подарка.', 'Плотная бумага', 'Упаковка', true, '/demo/photos/I7C5S7868Jk.jpg', '{"productType":"Упаковка","tags":["gift-wrap"]}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N13023');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13031', 'Набор «Сияние»', 'Gift Box', 'Подарки', 2790, 'Подарок для ухода за лицом.', '3 продукта, 3 продукта', 'Подарок', true, '/demo/photos/ZLTlHeKbh04.jpg', '{"productType":"Наборы для лица","tags":["gift-face"],"volume":"3 продукта"}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N13031');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13032', 'Набор «Увлажнение»', 'Gift Box', 'Подарки', 2490, 'Подарок для ухода за лицом.', '3 продукта, 3 продукта', 'Подарок', true, '/demo/photos/f94JPVrDbnY.jpg', '{"productType":"Наборы для лица","tags":["gift-face"],"volume":"3 продукта"}'::jsonb || jsonb_build_object('oldPrice', round(2490 * 1.4 / 10) * 10)
where not exists (select 1 from products where sku = 'DEMO-N13032');
insert into products (store_id, sku, name, brand, category, price, description, characteristics, purpose, in_stock, image_url, attributes)
select (select store_id from profiles where role = 'owner' limit 1), 'DEMO-N13033', 'Мини-набор «Открытие»', 'Gift Box', 'Подарки', 1490, 'Подарок для ухода за лицом.', '3 продукта, 4 миниатюры', 'Подарок', true, '/demo/photos/I7C5S7868Jk.jpg', '{"productType":"Наборы для лица","tags":["gift-face"],"volume":"4 миниатюры","hit":true}'::jsonb
where not exists (select 1 from products where sku = 'DEMO-N13033');
