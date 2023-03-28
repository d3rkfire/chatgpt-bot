require("dotenv").config()

import { Configuration, OpenAIApi } from "openai"
const config = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true})
bot.on("message", (message, metadata) => {
    const chatId = message.chat.id
    response=""
    bot.sendMessage(chatId, response)
})