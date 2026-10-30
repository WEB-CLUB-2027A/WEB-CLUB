ALTER TABLE users
    ADD COLUMN dashboard_logo VARCHAR(2048) NOT NULL DEFAULT '' AFTER cover_image;
