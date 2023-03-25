# node Dockerfile
FROM node:latest

ENV OPENAI_API_KEY=
ENV DISCORD_TOKEN=
ENV SYSTEM_MESSAGE="You are an AI Assistant"
ENV LANGUAGE_MODEL="gpt-3.5-turbo"
ENV ERROR_RESPONSE="I'm sorry, I am having trouble talking right now. Please try again later."
ENV MODERATION_VIOLATION_RESPONSE="This conversation has gotten too spicy.  I'm forgetting everything that was said."
ENV BOT_NAME=
ENV BOT_IMAGE_URL=
ENV ONLY_RESPOND_TO_MENTIONS=true
ENV ONLY_RESPOND_IN_CHANNEL=

# Create app directory
WORKDIR /usr/src/app
# Install app dependencies
COPY package*.json ./
RUN npm install
# Bundle app source
COPY . .
CMD [ "npm", "start" ]
