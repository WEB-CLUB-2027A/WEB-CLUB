ALTER TABLE users
    ADD COLUMN github_url VARCHAR(2048) NOT NULL DEFAULT '' AFTER dashboard_logo,
    ADD COLUMN linkedin_url VARCHAR(2048) NOT NULL DEFAULT '' AFTER github_url;
