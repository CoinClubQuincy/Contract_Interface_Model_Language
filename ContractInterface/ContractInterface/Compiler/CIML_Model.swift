//
//  CIML_Model.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/28/22.
//

import SwiftUI
import Foundation

//{
//  "cimlVersion": "1.0.1",
//  "appVersion": "0.0.1",
//  "contractLanguage": "solidity ^0.8.10",
//  "name": "LedgerContract",
//  "symbol": "LC",
//  "logo": "https\\:ipfs.address.url.jpeg",
//  "thumbnail": "https\\:ipfs.address.url.jpeg",
//  "websitelink":"https\\:DAppletSite.com",
//  "ciml_url":"https\\:DAppletSite.com/ciml",
//  "description": "This is the description of the Dapp provided",
//  "networks":["XDC"],
//  "contractMainnet": ["xdcerG45fCgvgh&%vhvctcr678BB"],
//  "screenShots":[""],
//  "abi": "func1(uint _count)",
//  "byteCode": "--bytes--",
//  "variables": [""],
//  "functions": [""],
//  "objects": [""],
//  "views": [""],
//  "metadata": [""]
//}


// MARK: - CIMLModel
struct CIML: Codable {
    let cimlVersion, appVersion, contractLanguage, name: String
    let symbol, logo, thumbnail, websitelink: String
    let cimlURL, description: String
    let contractMainnet: String
    let networks, screenShots: [String]
    let abi, byteCode: String
    let variables: [Object]
    let functions: [String]
    let objects: [Object]
    let views: [Views]
    let metadata: [String]

    enum CodingKeys: String, CodingKey {
        case cimlVersion, appVersion, contractLanguage, name, symbol, logo, thumbnail, websitelink, cimlURL
        case description = "description"
        case networks, contractMainnet, screenShots, abi, byteCode, variables, functions, objects, views, metadata
    }
}

// MARK: - Object
struct Object: Codable,Identifiable {
    //let name, type, value: String
    //let view: Int?
    let id: String = UUID().uuidString
    var backgroundColor: String?
    var type: String?
    var frame: [Int]?
    var fontWeight: String?
    var cornerRadius: CGFloat?
    var font: String?
    var padding: Int?
    var name: String?
    var foreGroundColor: String?
    var bold: Bool?
    var location: Int? // remove
    var value: String?
    var alignment: String?
    var shadow: CGFloat?
    //textfield
    var textField: String?
    //Icon has generic properties
    
    enum CodingKeys: String, CodingKey {
      case backgroundColor
      case type
      case frame
      case fontWeight
      case cornerRadius
      case font
      case padding
      case name
      case foreGroundColor
      case bold
      case location
      case value
      case alignment
      case shadow
      case textField
    }
}

// MARK: - View
struct Views: Codable {
    let view: Int
    let object: String
    let location: Int

    enum CodingKeys: String, CodingKey {
        case view = "View"
        case object = "Object"
        case location
    }
}

//MARK: Object ViewModels
struct Variable_Model: Codable{
    let id: String = UUID().uuidString
    let varName:String
    let type:String
    var value:String
}
//MARK: Function Model
struct Function_Model:Identifiable {
    let id: String = UUID().uuidString
    let funcName:String
    let type:String
    var inputValue:[String]
    var outputValue:[String]
}
//MARK: CIMLText
struct CIMLText: Identifiable {
    let id: String = UUID().uuidString
    var text:String
    var foreGroundColor:Color = .black
    var font:Font = .headline
    var frame:[CGFloat] = [100,50]
    var alignment:Alignment = .center
    var backgroundColor:Color = .clear
    var cornerRadius:CGFloat = 0.0
    var bold:Bool = false
    var fontWeight:Font.Weight = .regular
    var shadow:CGFloat = 0.0
    var padding:CGFloat = 20
    var location:Int
}
//MARK: CIMLTextField
struct CIMLTextField: Identifiable {
    let id: String = UUID().uuidString
    var text:String
    var textField:String = ""
    var foreGroundColor:Color = .gray
    var frame:[CGFloat] = [300,60]
    var alignment:Edge.Set = .horizontal
    var backgroundColor:Color = .white
    var cornerRadius:CGFloat = 10
    var shadow:CGFloat = 10
    var padding:CGFloat = 20
    var location:Int
}
//MARK: CIMLSYSImage
struct CIMLSYSImage: Identifiable {
    let id: String = UUID().uuidString
    var name:String
    var frame:[CGFloat] = [50]
    var padding:CGFloat = 20
    var color:Color = .black
    var location:Int
}
//MARK: CIMLButton
struct CIMLButton: Identifiable {
    let id: String = UUID().uuidString
    var text:String
    var isIcon:Bool = false
    var foreGroundColor:Color = .black
    var font:Font = .headline
    var frame:[CGFloat] = [100,50]
    var alignment:Alignment = .center
    var backgroundColor:Color = .blue
    var cornerRadius:CGFloat = 10.0
    var bold:Bool = false
    var fontWeight:Font.Weight = .regular
    var shadow:CGFloat = 10.0
    var padding:CGFloat = 20
    var location:Int
    var type:[String]
    var value:[String]
}


