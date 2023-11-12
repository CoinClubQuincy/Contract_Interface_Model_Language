# Contract Interface Model Language (CIML)

- ***<u>Contract Interface Model Language</u>*** - **(CIML)** is a UI File used for blokchain Dapps to compile their user interface within a mobile or web app on demand this json file follows a strict set of rules to allow for dynamic compiling of user interfaces into a multitude of devices which have adopted the framework.


https://youtu.be/9Pho88SSpsU

## Table of Contents
- [Video Demonstration](#video-demonstration)
- [What is CIML](#what-is-ciml)
- [Why I created CIML](#why-i-created-ciml)
- [CIML Consists of 2 Parts](#ciml-consists-of-2-parts)
- [Web3Swift SDK](#web3swift-sdk)
- [CIML No Code Builder App](#ciml-no-code-builder-app)
- [What is a CIML Document](#what-is-a-ciml-document)
- [What are CIML Objects](#what-are-ciml-objects)
- [How CIML Interacts with Smart Contracts](#how-ciml-interacts-with-smart-contracts)
- [The Contract Interface Builder (No Code UI Solution)](#the-contract-interface-builder-no-code-ui-solution)
- [The DApp Internet and How to Use the SDK](#the-dapp-internet-and-how-to-use-the-sdk)

## Video Demonstration
[Link to Video Demonstration]

## What is CIML
Contract Interface Markup Language (CIML) is a framework that uses a specified JSON schema interface to display the same layout on multiple devices without the need for developers to code multiple interfaces for those devices.

## Why I created CIML
The creation of CIML was motivated by the challenges in blockchain app development:
- Each DApp requires users to download a software wallet, leading to complications and security concerns.
- DApp developers need to create secure software wallets just to enable their DApps.
- Developing a DApp typically involves writing code for every interface it's going to be on, such as iOS, Android, and WebJS, which is time-consuming and requires the maintenance of different codebases.

CIML aims to address these challenges by allowing a single mobile application to interact with multiple DApps on the network, simplifying DApp development and enhancing user experience.

## CIML Consists of 2 Parts
### CIML Software Development Kit
The CIML SDK is a library designed for multiple languages and devices. It allows CIML Documents to compile applications for various devices without requiring blockchain developers to create different interface applications for smart contracts. The CIML SDK includes a built-in software wallet for EVM networks, a landing page for downloaded DApps, and a QR scanning feature for reading CIML Document URLs.

### CIML Documents
CIML Documents are JSON files that contain CIML objects, contract bytecode, and ABI information. These documents can be compiled on any device or app that uses the CIML SDK, making smart contract development accessible on multiple devices.

## Web3Swift SDK
- Description: This is a development tool that includes the CIML library to compile apps on demand, as well as a set of other tools for developers.

## CIML No Code Builder App
- Contract Interface - Allows users to create CIML Documents that interact with the contract and a software wallet without needing to be a mobile developer or code.
- This app can create and compile applications with wallet signing and contract interfacing capabilities.
- It displays an app icon for the DApp in the DApps Display page, making DApps on the blockchain appear like native apps on your phone.

## What is a CIML Document
A CIML Document is a JSON file that adheres to the CIML Schema. This schema can be read by the CIML SDK, which resides in a mobile app (iOS, Android) or other devices like web apps or desktop applications. It allows developers to write a single document.

## What are CIML Objects
CIML Objects are the building blocks of the language, describing the interface and mapping it to the smart contract:
- Text: On-screen text for users to see.
- Button: Users can click and engage in actions on-screen or on-chain.
- Icon: Reference SF symbols over a library of symbols.
- Views: Specify the object, its location, and the page it's on.
- Variables: Can change both on-chain and locally to add dynamics to the application.
- Function: Maps smart contract functions to the application and uses a library of local functions to make the app more dynamic.
- Images (Coming soon): Can be referenced in the application over the internet.

Example CIML Objects:
- Text/Button
```json
{
   "name": "textorButton1",
   "type": "Text",
   "value": "var1",
   "foreGroundColor":"black",
   "font":"headlines",
   "frame":[100,50],
   "alignment":"center",
   "backgroundColor":"white",
   "cornerRadius":0.0,
   "bold":false,
   "fontWeight":"regular",
   "shadow":0.0,
   "padding":20
}
```
 
- TextField
```json
{
   "name": "textField1",
   "type": "TextField",
   "value": "var1",
   "textField": "enter info",
   "foreGroundColor":"gray",
   "frame":[100,50],
   "alignment":"center",
   "backgroundColor":"white",
   "cornerRadius":10.0,
   "shadow":10.0,
   "padding":20
}
```

- Icon
```json
{
   "name": "icon1",
   "type": "sysimage",
   "value": "gear",
   "foregroundcolor":"black",
   "frame":[100,50],
   "padding":20
}

```

- Views
```json
{
   "View": 0,
   "Object": "text1",
   "location": 5
}

```

- Variables
```json
{
   "name": "var1",
   "type": "string",
   "value": "This is a text"
}

```


```json
```


# CIML File

```json
// CIML Basic Format | Simple Interface Contracts generated by file onto multiple device types | Mobile, Web, Tablet

{
  "cimlVersion": "1.0.1",
  "appVersion": "0.0.1",
  "contractLanguage": "solidity ^0.8.10",
  "network":["XDC"],
  "name": "LedgerContract",
  "symbol": "LC",
  "logo": "https\\:ipfs.address.url.jpeg",
  "thumbnail": "https\\:ipfs.address.url.jpeg",
  "websitelink":"https\\:DAppletSite.com",
  "description": "This is the description of the Dapp provided",
  "contractMainnet": ["xdcerG45fCgvgh&%vhvctcr678BB"],
  "contractTestnet": ["xdcers4d5fr6t7y8uj98ugyftghdw2"],
  "screenShots":[""],
  "abi": ""
  "byteCode": "",
  "variables": [],
  "functions": [],
  "objects": [],
  "views": [],
  "metadata": []
}

```
# CIML DApplet Examples






# CIML Document Example 2 = Form
```json
[
  {
    "cimlVersion": "1.0.1",
    "appVersion": "0.0.1",
    "contractLanguage": "solidity ^0.8.10",
    "name": "Test 3",
    "symbol": "LC",
    "logo": "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/LOGO/logo.png",
    "thumbnail": "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/THUMBNAIL/XDC.png",
    "websitelink":"https\\:DAppletSite.com",
    "cimlURL":"https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-3.json",
    "description": "This is example 3 app this is the descriptions",
    "networks":["XDC"],
    "contractMainnet": ["0x8d71325b899658DD4470774789b016F98BA02309"],
    "screenShots":[""],
    "abi": "[{@inputs@:[],@stateMutability@:@nonpayable@,@type@:@constructor@},{@inputs@:[{@internalType@:@uint256@,@name@:@_int@,@type@:@uint256@}],@name@:@writeINT@,@outputs@:[{@internalType@:@uint256@,@name@:@@,@type@:@uint256@}],@stateMutability@:@nonpayable@,@type@:@function@},{@inputs@:[{@internalType@:@string@,@name@:@_string@,@type@:@string@},{@internalType@:@string@,@name@:@_Nstring@,@type@:@string@}],@name@:@writeMultiString@,@outputs@:[{@internalType@:@string@,@name@:@@,@type@:@string@},{@internalType@:@string@,@name@:@@,@type@:@string@},{@internalType@:@string@,@name@:@@,@type@:@string@}],@stateMutability@:@nonpayable@,@type@:@function@},{@inputs@:[{@internalType@:@string@,@name@:@_string@,@type@:@string@}],@name@:@writeString@,@outputs@:[{@internalType@:@string@,@name@:@@,@type@:@string@}],@stateMutability@:@nonpayable@,@type@:@function@},{@inputs@:[],@name@:@Bool@,@outputs@:[{@internalType@:@bool@,@name@:@@,@type@:@bool@}],@stateMutability@:@view@,@type@:@function@},{@inputs@:[],@name@:@Numb@,@outputs@:[{@internalType@:@uint256@,@name@:@@,@type@:@uint256@}],@stateMutability@:@view@,@type@:@function@},{@inputs@:[],@name@:@read@,@outputs@:[{@internalType@:@uint256@,@name@:@@,@type@:@uint256@}],@stateMutability@:@view@,@type@:@function@},{@inputs@:[],@name@:@String@,@outputs@:[{@internalType@:@string@,@name@:@@,@type@:@string@}],@stateMutability@:@view@,@type@:@function@},{@inputs@:[{@internalType@:@bool@,@name@:@_bool@,@type@:@bool@}],@name@:@writeBool@,@outputs@:[{@internalType@:@bool@,@name@:@@,@type@:@bool@}],@stateMutability@:@pure@,@type@:@function@}]",
    "byteCode": "--bytes--",
    "variables": [
      {
        "name": "_button1",
        "type": "var-text1",
        "value": "new string"
      },
      {
        "name": "text1",
        "type": "text",
        "value": "Forum test"
      },
      {
        "name": "text2",
        "type": "text",
        "value": "test write"
      },
      {
        "name": "textField1",
        "type": "textField",
        "value": "text1"
      },      
      {
        "name": "background",
        "type": "0",
        "value": "#ffa8e2"
      },
      {
        "name": "background",
        "type": "1",
        "value": "#FFA500"
      },
      {
        "name": "button1",
        "type": "text",
        "value": "Write to test"
      },
      {
        "name": "_button2",
        "type": "Send10x6FfB1b55C080aF7057c9E3390CEb54A94d55B4bf",
        "value": "1000000000000000000"
      }
    ],
    "functions": [],
    "objects": [
        {
          "name": "text1",
          "type": "text", 
          "value": "this is the else statement",
          "foreGroundColor":".black",
          "font":"headlines",
          "frame":[100,50],
          "alignment":"center",
          "backgroundColor":".white",
          "cornerRadius":0.0,
          "bold":false,
          "fontWeight":"regular",
          "shadow":0.0,
          "padding":20
      },
      {
        "name": "textField1",
        "type": "textField", 
        "value": "text1",
        "textField": "enter name",
        "foreGroundColor":"gray",
        "frame":[150,50],
        "alignment":"center",
        "backgroundColor":"white",
        "cornerRadius":10.0,
        "shadow":10.0,
        "padding":20
    },
    {
      "name": "textField2",
      "type": "textField", 
      "value": "text1",
      "textField": "enter name",
      "foreGroundColor":"gray",
      "frame":[150,50],
      "alignment":"center",
      "backgroundColor":"white",
      "cornerRadius":10.0,
      "shadow":10.0,
      "padding":20
  },
  {
    "name": "textField3",
    "type": "textField", 
    "value": "text1",
    "textField": "enter name",
    "foreGroundColor":"gray",
    "frame":[150,50],
    "alignment":"center",
    "backgroundColor":"white",
    "cornerRadius":10.0,
    "shadow":10.0,
    "padding":20
},
{
  "name": "textField4",
  "type": "textField", 
  "value": "text1",
  "textField": "enter name",
  "foreGroundColor":"gray",
  "frame":[150,50],
  "alignment":"center",
  "backgroundColor":"white",
  "cornerRadius":10.0,
  "shadow":10.0,
  "padding":20
},
      {
        "name": "text3",
        "type": "text", 
        "value": "Second Page",
        "foreGroundColor":".black",
        "font":"headlines",
        "frame":[100,50],
        "alignment":"center",
        "backgroundColor":".white",
        "cornerRadius":0.0,
        "bold":false,
        "fontWeight":"regular",
        "shadow":0.0,
        "padding":20
    },
      {
        "name": "text2",
        "type": "text", 
        "value": " This is Test1 text ",
        "foreGroundColor":".black",
        "font":"headlines",
        "frame":[300,400],
        "alignment":"center",
        "backgroundColor":".white",
        "cornerRadius":0.0,
        "bold":false,
        "fontWeight":"regular",
        "shadow":0.0,
        "padding":20
    },
    {
      "name": "icon1",
      "type": "sysimage", 
      "value": "square.and.pencil.circle.fill",
      "foregroundcolor":".black",
      "frame":[50,50],
      "padding":20
  },
  {
    "name": "button1",
    "type": "button", 
    "value": "write",
    "foreGroundColor":".black",
    "font":"headlines",
    "frame":[100,50],
    "alignment":"center",
    "backgroundColor":".white",
    "cornerRadius":10.0,
    "bold":false,
    "fontWeight":"regular",
    "shadow":0.0,
    "padding":20
},
{
  "name": "button2",
  "type": "button", 
  "value": "next page",
  "foreGroundColor":".black",
  "font":"headlines",
  "frame":[100,50],
  "alignment":"center",
  "backgroundColor":".white",
  "cornerRadius":10.0,
  "bold":false,
  "fontWeight":"regular",
  "shadow":0.0,
  "padding":20
}
    ],
    "views": [
      {
        "View": 0,
        "Object": "text1",
        "location": 5
      },
      {
        "View": 0,
        "Object": "text2",
        "location": 95
      },
      {
        "View": 0,
        "Object": "textField1",
        "location": 23
      },
      {
        "View": 0,
        "Object": "textField2",
        "location": 41
      },
      {
        "View": 0,
        "Object": "textField3",
        "location": 59
      },
      {
        "View": 0,
        "Object": "textField4",
        "location": 77
      },
      {
        "View": 0,
        "Object": "text2",
        "location": 50
      },
      {
        "View": 0,
        "Object": "icon1",
        "location": 9
      },
      {
        "View": 0,
        "Object": "button1",
        "location": 111
      },
      {
        "View": 0,
        "Object": "button2",
        "location": 115
      }
    ],
    "metadata": [
      "Top Descriptor",
      "xdc",
      "document",
      "test",
      "downloadable"
    ]
  }
]


```
