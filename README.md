# MiniShop Frontend

Lightweight frontend built with:

- React
- TypeScript
- Vite (native TS compile flow)
- Tailwind CSS classes

It consumes the API from `../minishop_api/minishop` (`/api/v1/...`).

## Run

```bash
npm install
npm run dev
```

## API base URL

By default, the app calls `/api/v1` and Vite proxies `/api` to `http://localhost:3000`.

If your API runs on another origin, set:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## Implemented screens

- Login / Logout (`POST /login`, `POST /logout`, `GET /me`)
- Categories + Products list with search/filter/pagination
- Category Admin CRUD (create/update/delete + category detail)
- Cart (`GET /cart`, add/update/delete cart items)
- Checkout + My Orders (+ order detail)
- Admin Orders (status filter + status update)
- Product Reviews (list + create)
- Product detail view (`GET /products/:id`)
