import { ArrowBackIcon, ArrowRightIcon, EmailIcon } from "@chakra-ui/icons";
import {
  Box,
  Button,
  FormControl,
  IconButton,
  Input,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { getProfile, getSender } from "../config/ChatLogic";
import { ChatState } from "../Context/ChatProvider";
import ProfileModal from "./miscellaneous/ProfileModal";
import UpdateGroupChatModal from "./miscellaneous/UpdateGroupChatModal";
import ScrollableChat from "./ScrollableChat";
import "./styles.css";
import io from "socket.io-client";
import Lottie from "react-lottie";
import animationData from "../Animation/typing-animation.json";

const ENDPOINT = "https://lets-get-talk.herokuapp.com/"; // "http://localhost:5000/" development side
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState();
  const [socketConnected, setSocketConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typing, setTyping] = useState(false);

  const toast = useToast();

  const { user, selectedChat, setSelectedChat, notification, setNotification } =
    ChatState();

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const fetchMessage = async () => {
    if (!selectedChat) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };

      setLoading(true);

      const { data } = await axios.get(
        `api/message/${selectedChat._id}`,
        config
      );

      // console.log("Message fetch", messages);
      setMessages(data);
      setLoading(false);
      socket.emit("joinChat", selectedChat._id);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load message",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom-left",
      });
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stopTyping", () => setIsTyping(false));
    // eslint-disable-next-line
  }, []);

  // console.log("socket.io " + socketConnected);
  useEffect(() => {
    fetchMessage();

    selectedChatCompare = selectedChat;
    // eslint-disable-next-line
  }, [selectedChat]);

  // console.log(notification, "new notification");

  useEffect(() => {
    socket.on("messageReceived", (newMessageReceived) => {
      if (
        !selectedChatCompare || // if chat is not selected or doesn't match current chat
        selectedChatCompare._id !== newMessageReceived.chat._id
      ) {
        if (!notification.includes(newMessageReceived)) {
          setNotification([newMessageReceived, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageReceived]);
      }
    });
  });

  const sendMessage = async (event) => {
    if (
      (event.key === "Enter" && newMessage) ||
      (event.type === "click" && newMessage)
    ) {
      socket.emit("stopTyping", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };

        const { data } = await axios.post(
          "api/message",
          { content: newMessage, chatId: selectedChat._id },
          config
        );
        // console.log(data);
        socket.emit("newMessage", data);
        setNewMessage("");
        setMessages([...messages, data]);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to send message",
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom-left",
        });
      }
    }
  };

  const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }

    let lastTypingTime = new Date().getTime();
    let timerLength = 3000;

    setTimeout(() => {
      let timeNow = new Date().getTime();
      let timeDiff = timeNow - lastTypingTime;

      if (timeDiff >= timerLength && typing) {
        socket.emit("stopTyping", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };

  return (
    <>
      {selectedChat ? (
        <>
          <Text
            fontSize={{ base: "28px", md: "30px" }}
            pb={3}
            px={2}
            w="100%"
            display="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
          >
            <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<ArrowBackIcon />}
              onClick={() => setSelectedChat("")}
            />
            {!selectedChat.isGroupChat ? (
              <>
                {getSender(user, selectedChat.users)}
                <ProfileModal user={getProfile(user, selectedChat.users)} />
              </>
            ) : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchMessage={fetchMessage}
                />
              </>
            )}
          </Text>
          <Box
            display="flex"
            flexDir="column"
            justifyContent="flex-end"
            p={3}
            bg="#E8E8E8"
            w="100%"
            h="100%"
            borderRadius="lg"
            overflowY="hidden"
          >
            {/* Chat Messages */}
            {loading ? (
              <Spinner
                size="xl"
                w={20}
                h={20}
                alignSelf="center"
                margin="auto"
              />
            ) : (
              <div className="messages">
                <ScrollableChat messages={messages} />
              </div>
            )}
            <FormControl onKeyDown={sendMessage} isRequired mt={3}>
              {isTyping ? (
                <Box>
                  <Lottie
                    options={defaultOptions}
                    // height={50}
                    width={80}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </Box>
              ) : (
                <></>
              )}
              <Box display="flex">
                <Input
                  variant="outline"
                  bg="#FFFFFF"
                  mr={2}
                  placeholder="Enter a message..."
                  onChange={typingHandler}
                  value={newMessage}
                />
                <Button
                  rightIcon={<ArrowRightIcon />}
                  color="#FFFFFF"
                  bg="#6892ef"
                  onClick={sendMessage}
                >
                  Send
                </Button>
              </Box>
            </FormControl>
          </Box>
        </>
      ) : (
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          h="100%"
        >
          <Text fontSize="3xl" pb={3}>
            Let's Start Chatting
          </Text>
        </Box>
      )}
    </>
  );
};

export default SingleChat;
