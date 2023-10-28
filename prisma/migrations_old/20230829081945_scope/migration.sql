-- CreateTable
CREATE TABLE "Scope" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Scope_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_scope" (
    "account_id" TEXT NOT NULL,
    "scope_id" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "account_scope_account_id_scope_id_key" ON "account_scope"("account_id", "scope_id");

-- AddForeignKey
ALTER TABLE "account_scope" ADD CONSTRAINT "account_scope_scope_id_fkey" FOREIGN KEY ("scope_id") REFERENCES "Scope"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
