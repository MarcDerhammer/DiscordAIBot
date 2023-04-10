import {
  ApplicationCommandOptionType,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type Client
} from 'discord.js'
const COMMAND_PERMISSIONS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ManageGuild
]

export default async (client: Client<boolean>): Promise<void> => {
  const reset = new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Reset the chat for this channel')
    .addStringOption((option) => {
      return option
        .setName('reset_type')
        .setDescription('What to reset')
        .setRequired(true)
        .addChoices(
          {
            name: 'All -  Clear ALL messages (User, System, and Bot)',
            value: 'all'
          },
          {
            name: 'User - Clear only User messages',
            value: 'user'
          },
          {
            name: 'Bot - Clear only Bot messages',
            value: 'bot'
          },
          {
            name: 'System - Clear only System messages',
            value: 'system'
          }
        )
    })

  await client.application?.commands.set([
    reset,
    {
      name: 'config',
      description: 'Configure the settings for this channel',
      defaultMemberPermissions: COMMAND_PERMISSIONS,
      options: [
        {
          name: 'only_mentions',
          description: 'Only respond to mentions (default: true)',
          type: ApplicationCommandOptionType.Boolean,
          required: true
        },
        // {
        //   name: 'ignore_bots',
        //   description: 'Ignore messages from bots (default: true)',
        //   type: ApplicationCommandOptionType.Boolean,
        //   required: true
        // },
        // {
        //   name: 'ignore_everyone_mentions',
        //   description: 'Ignore @everyone and @here (default: true)',
        //   type: ApplicationCommandOptionType.Boolean,
        //   required: true
        // },
        {
          name: 'language_model',
          description: 'Which language model to use (default: GPT-3.5 Turbo) GPT-4 is ' +
            'more expensive',
          type: ApplicationCommandOptionType.String,
          required: true,
          choices: [
            {
              name: 'GPT-3.5 Turbo',
              value: 'gpt-3.5-turbo'
            },
            {
              name: 'GPT-4',
              value: 'gpt-4'
            }
          ]
        }
      ]
    },
    {
      name: 'tokens',
      description: 'Check how many tokens are available and buy more'
    },
    {
      name: 'who',
      description: 'Check how this bot is is configured including any ' +
        'system messages that are currently set'
    },
    {
      name: 'system',
      description: 'Add a system message to this channel',
      defaultMemberPermissions: COMMAND_PERMISSIONS,
      options: [
        {
          name: 'add',
          description: 'Add a system message. Example: ',
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: 'message',
              description: 'The message to add',
              type: ApplicationCommandOptionType.String,
              required: true

            }
          ]
        },
        {
          name: 'list',
          description: 'List all system messages',
          type: ApplicationCommandOptionType.Subcommand
        }
      ]
    },
    {
      name: 'help',
      description: 'Get help with this bot'
    }
  ])
}
