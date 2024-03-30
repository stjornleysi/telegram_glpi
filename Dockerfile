FROM node
WORKDIR /bot
RUN npm install nodemon -g
COPY ./ ./
CMD ["nodemon", "telegram_support_bot.js"]
