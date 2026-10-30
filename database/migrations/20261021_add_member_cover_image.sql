ALTER TABLE members
    ADD COLUMN cover_image VARCHAR(2048) NOT NULL DEFAULT '' AFTER profile_image;
