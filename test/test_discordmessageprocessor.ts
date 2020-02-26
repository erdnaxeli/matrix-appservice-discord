/*
Copyright 2017 - 2019 matrix-appservice-discord

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import * as Chai from "chai"; // TODO: Use expect
import * as Discord from "discord.js";
import { DiscordMessageProcessor } from "../src/discordmessageprocessor";
import { DiscordBot } from "../src/bot";
import { MockGuild } from "./mocks/guild";
import { MockMember } from "./mocks/member";
import { MockMessage } from "./mocks/message";

// we are a test file and thus need those
/* tslint:disable:no-unused-expression max-file-line-count no-any */

const bot = {
    ChannelSyncroniser: {
        GetAliasFromChannel: async (chan) => {
            if (chan.id === "456") {
                return "#_discord_123_456:localhost";
            }
            return null;
        },
    },
    GetEmoji: async (name: string, animated: boolean, id: string): Promise<string> => {
        if (id === "3333333") {
            return "mxc://image";
        } else {
            throw new Error("Emoji not found");
        }
    },
};

describe("DiscordMessageProcessor", () => {
    describe("FormatMessage", async () => {
        it("processes plain text messages correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const msg = new MockMessage() as any;
            msg.embeds = [];
            msg.content = "Hello World!";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello World!");
            Chai.assert.equal(result.formattedBody, "Hello World!");
        });
        it("processes markdown messages correctly.", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const msg = new MockMessage() as any;
            msg.embeds = [];
            msg.content = "Hello *World*!";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello *World*!");
            Chai.assert.equal(result.formattedBody, "Hello <em>World</em>!");
        });
        it("processes non-discord markdown correctly.", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const msg = new MockMessage() as any;
            msg.embeds = [];
            msg.content = ">inb4 tests";
            let result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, ">inb4 tests");
            Chai.assert.equal(result.formattedBody, "&gt;inb4 tests");

            msg.embeds = [];
            msg.content = "[test](http://example.com)";
            result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "[test](http://example.com)");
            Chai.assert.equal(result.formattedBody,
                "[test](<a href=\"http://example.com\">http://example.com</a>)");
        });
        it("processes discord-specific markdown correctly.", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const msg = new MockMessage() as any;
            msg.embeds = [];
            msg.content = "_ italic _";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "_ italic _");
            Chai.assert.equal(result.formattedBody, "<em> italic </em>");
        });
        it("replaces @everyone correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const msg = new MockMessage() as any;
            msg.embeds = [];
            msg.content = "hey @everyone!";
            let result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "hey @everyone!");
            Chai.assert.equal(result.formattedBody, "hey @everyone!");

            msg.mentions.everyone = true;
            result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "hey @room!");
            Chai.assert.equal(result.formattedBody, "hey @room!");
        });
        it("replaces @here correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const msg = new MockMessage() as any;
            msg.embeds = [];
            msg.content = "hey @here!";
            let result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "hey @here!");
            Chai.assert.equal(result.formattedBody, "hey @here!");

            msg.mentions.everyone = true;
            result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "hey @room!");
            Chai.assert.equal(result.formattedBody, "hey @room!");
        });
    });
    describe("InsertUser / HTML", () => {
        it("processes members missing from the guild correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            const channel = new Discord.TextChannel(guild, {});
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "<@12345>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "@_discord_12345:localhost");
            Chai.assert.equal(result.formattedBody, "<a href=\"https://matrix.to/#/@_discord_12345:l" +
                "ocalhost\">@_discord_12345:localhost</a>");
        });
        it("processes members with usernames correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            guild._mockAddMember(new MockMember("12345", "TestUsername"));
            const channel = new Discord.TextChannel(guild, {});
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "<@12345>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "TestUsername");
            Chai.assert.equal(result.formattedBody, "<a href=\"https://matrix.to/#/@_discord_123" +
                "45:localhost\">TestUsername</a>");
        });
        it("processes members with nickname correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            guild._mockAddMember(new MockMember("12345", "TestUsername", null, "TestNickname"));
            const channel = new Discord.TextChannel(guild, {});
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "<@12345>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "TestNickname");
            Chai.assert.equal(result.formattedBody, "<a href=\"https://matrix.to/#/@_disc" +
                "ord_12345:localhost\">TestNickname</a>");
        });
    });
    describe("InsertMxcImages / HTML", () => {
        it("processes unknown emoji correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            const channel = new Discord.TextChannel(guild, {id: "456", name: "TestChannel"});
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "Hello <:hello:123456789>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello <:hello:123456789>");
            Chai.assert.equal(result.formattedBody, "Hello &lt;:hello:123456789&gt;");
        });
        it("processes emoji correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            const channel = new Discord.TextChannel(guild, {id: "456", name: "TestChannel"});
            guild.channels.set("456", channel);
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "Hello <:hello:3333333>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello :hello:");
            Chai.assert.equal(result.formattedBody, "Hello <img alt=\"hello\" ti" +
                "tle=\"hello\" height=\"32\" src=\"mxc://image\" />");
        });
    });
    describe("InsertChannelPills / HTML", () => {
        it("processes unknown channel correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            const channel = new Discord.TextChannel(guild, {id: "456", name: "TestChannel"});
            guild.channels.set("456", channel);
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "Hello <#3333333>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello <#3333333>");
            Chai.assert.equal(result.formattedBody, "Hello &lt;#3333333&gt;");
        });
        it("processes channels correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            const channel = new Discord.TextChannel(guild, {id: "456", name: "TestChannel"});
            guild.channels.set("456", channel);
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "Hello <#456>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello #TestChannel");
            Chai.assert.equal(result.formattedBody, "Hello <a href=\"https://matrix.to/#/#_discord_123" +
                "_456:localhost\">#TestChannel</a>");
        });
        it("processes channels without alias correctly", async () => {
            const processor = new DiscordMessageProcessor(
                "localhost", bot as DiscordBot);
            const guild: any = new MockGuild("123", []);
            const channel = new Discord.TextChannel(guild, {id: "678", name: "TestChannel"});
            guild.channels.set("678", channel);
            const msg = new MockMessage(channel) as any;
            msg.embeds = [];
            msg.content = "Hello <#678>";
            const result = await processor.FormatMessage(msg);
            Chai.assert.equal(result.body, "Hello <#678>");
            Chai.assert.equal(result.formattedBody, "Hello &lt;#678&gt;");
        });
    });
});
