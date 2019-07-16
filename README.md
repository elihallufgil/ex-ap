# Coti Exchange Application

A Node.js (Sails.js v1 based) microservice, handling all communications with a coti full node.

The app exposes restful API endpoints that can be used by exchanges to:
- Monitor transactions,address balances (For example for identifying deposits and confirming withdrawals)
- Send transactions (Withdrawals)
- Generate wallet addresses (For example for issuing a wallet address per each exchange customer)

### Version info

Version 1.0.1

### Dependencies

+ [Coti encyption library](https://github.com/coti-io/coti-encryption-library)

Environemnt Variables
=====================
| ENV Vars                         | Required | 
| ---------------------------------|----------|
| API_KEY                          |    V     |
| FULL_NODE_URL                    |    V     |
| OPEN_IPS                         |          |
| SEED                             |    V     |
| TRUSTSCORE_URL                   |    V     |
| WEBHOOK_BALANCE_UPDATES          |          |
| WEBHOOK_TRANSACTIONS_UPDATES     |          |
| WEBHOOK_FREQ_MINUTES             |          |

### Quick setting of the environment variables

- Create a file ".env.json" in the application root folder
- Place the following json inside:

```json
{
  "API_KEY": "defineYourKeyHere",
  "OPEN_IPS": "",
  "SEED":"beb70e764b8ea22be9cd728e03ec1bb32091e730f7f46a7423ee695be8de5e06",
  "FULL_NODE_URL":"https://testnet-fullnode1.coti.io",
  "TRUSTSCORE_URL":"https://testnet-trustscore1.coti.io",
  "WEBHOOK_NOTIFICATIONS_ENABLED":"true",
  "WEBHOOK_BALANCE_UPDATES":"http://yourbackendip:80/balances",
  "WEBHOOK_TRANSACTIONS_UPDATES":"http://yourbackendip:80/transactions"
}
```

### Installation

**After defining the environment variables above**
**With [node](http://nodejs.org) [installed](http://nodejs.org/en/download):**

```sh
$ npm install
$ npm install sails -g
$ npm run setup
```

### Running

```sh
$ sails lift
```

### Running with Docker

To pull the latest docker image from dockerhub:

```sh
docker pull exchangeapp/exchangeapp:latest
docker-compose -f docker-compose-init.yml up
docker-compose up -d
```

### Running with docker from source

The following docker commands will run the initial setup (required to run only once), followed by running the app with the required volumes and ports:

```sh
docker build -t "coti-exchange-app" .
docker run -v "$PWD/db/:/app/db" coti-exchange-app npm run setup
docker run -v "$PWD/db/:/app/db" -v "$PWD/.env.json:/app/.env.json" -v "$PWD/exchange-app.error.log:/app/exchange-app.error.log" -p 1337:1337 coti-exchange-app
```

Optionally, with docker-compose:

```sh
docker-compose -f docker-compose-init.yml up
docker-compose up -d
```

### Accessing the REST API Endpoints

The application runs by default on port 1337. Please see the API documentation for the relevant api endpoints