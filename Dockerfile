FROM node:10.15.3

ENV INSTALL_PATH /app
RUN mkdir -p $INSTALL_PATH

WORKDIR $INSTALL_PATH

COPY ./package.json .
COPY ./package-lock.json .

RUN npm install sails -g
RUN npm i
RUN npm i coti-encryption-library

COPY . .

CMD ["sails","lift"]
