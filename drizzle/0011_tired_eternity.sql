-- Reserved migration number. Native foreign keys require rebuilding existing D1
-- tables, while compound trigger statements are not accepted by the Sites D1
-- migration runner. Referential integrity remains enforced by canonical services.
PRAGMA optimize;
