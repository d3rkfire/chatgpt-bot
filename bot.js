require("dotenv").config()

const Configuration = require("openai").Configuration
const OpenAIApi = require("openai").OpenAIApi
const config = new Configuration({
    organization: process.env.OPENAI_ORGANIZATION,
    apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

const TelegramBot = require("node-telegram-bot-api")
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, {polling: true})
bot.on("message", (message) => {
    openai.createChatCompletion({
        model: process.env.OPENAI_MODEL,
        messages: [
            {role: "system", content: process.env.OPENAI_SYSTEM_MESSAGE},
            {role: "user", content: message.text}
        ]
    }).then((completion) => {
        bot.sendMessage(message.chat.id, completion.data.choices[0].message.content)
    })
})