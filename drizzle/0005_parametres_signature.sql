CREATE TABLE "parametres" (
	"cle" varchar(50) PRIMARY KEY NOT NULL,
	"valeur" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
