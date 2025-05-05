-- USER rolünü EMPLOYEE'ye güncelleme
UPDATE "User" SET role = 'EMPLOYEE' WHERE role = 'USER';

-- PROVIDER rolünü OWNER'a güncelleme
UPDATE "User" SET role = 'OWNER' WHERE role = 'PROVIDER';

-- Enum tipini güncelleme (önce eski enum tipini kaldırıp yenisini oluşturuyoruz)
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('EMPLOYEE', 'OWNER', 'ADMIN');

-- Verileri yeni enum tipine dönüştürme (varsayılan olarak EMPLOYEE kullan)
ALTER TABLE "User" 
  ALTER COLUMN role TYPE "UserRole" 
  USING CASE
    WHEN role::text = 'USER' THEN 'EMPLOYEE'::text
    WHEN role::text = 'PROVIDER' THEN 'OWNER'::text
    WHEN role::text = 'ADMIN' THEN 'ADMIN'::text
    ELSE 'EMPLOYEE'::text
  END::text::"UserRole";

-- Eski enum tipini silme
DROP TYPE "UserRole_old"; 