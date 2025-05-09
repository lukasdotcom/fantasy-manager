FROM node:22-alpine AS builder
ENV NODE_ENV production
ENV APP_ENV production
# Used to build the project
RUN mkdir app
WORKDIR /app
COPY components components
COPY Modules Modules
COPY pages pages
COPY public public
COPY scripts scripts
COPY styles styles
COPY eslint.config.mjs eslint.config.mjs
COPY next.config.js next.config.js
COPY package-lock.json package-lock.json
COPY package.json package.json
COPY tsconfig.json tsconfig.json
COPY tsconfig2.json tsconfig2.json
COPY types types
COPY locales locales
ENV SQLITE=/app/temp.db
RUN npm ci
RUN npm run build
RUN rm /app/temp.db
RUN rm -rf /app/scripts/data
RUN rm /app/scripts/data.ts

FROM node:22-alpine
ENV NODE_ENV production
ENV APP_ENV production
# Used to run the project
RUN mkdir app
WORKDIR /app
COPY --from=builder /app/.next /app/.next
COPY --from=builder /app/Modules /app/Modules
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/public /app/public
COPY --from=builder /app/scripts /app/scripts
COPY --from=builder /app/types /app/types
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/next.config.js /app/next.config.js
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/tsconfig2.json /app/tsconfig2.json
ENV NEXTAUTH_URL_INTERNAL=http://127.0.0.1:3000
RUN touch /app/revalidate

EXPOSE 3000

ENV PORT 3000

CMD npm run start:no-build