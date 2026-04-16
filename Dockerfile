# 1. Gunakan image dasar Node.js
FROM node:20-alpine

# 2. Tentukan folder kerja di dalam kontainer
WORKDIR /app

# 3. Copy file package.json dulu (biar install library lebih cepat)
COPY package*.json ./
COPY prisma ./prisma/

# Tambahkan flag --legacy-peer-deps untuk mengatasi konflik versi
RUN npm install --legacy-peer-deps

# 5. Copy semua file proyekmu ke dalam kontainer
COPY . .

# Kita berikan URL palsu hanya agar Prisma mau men-generate client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# 7. Build aplikasi Next.js
RUN npm run build

# 8. Buka port yang digunakan aplikasi
EXPOSE 3000

# 6. Jalankan aplikasi
CMD ["npm", "start"]
