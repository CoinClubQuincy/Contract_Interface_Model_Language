//
//  CIML_Model.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/28/22.
//

import Foundation
import SwiftUI
import Foundation
import Combine
// This file was generated from JSON Schema using quicktype, do not modify it directly.To parse the JSON, add this file to your project and do:   let welcome = try? newJSONDecoder().decode(Welcome.self, from: jsonData)
// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let welcome = try? newJSONDecoder().decode(Welcome.self, from: jsonData)

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
//  "variables": [
//    {
//      "name": "var1",
//      "type": "String",
//      "value": "this is an object"
//    }
//  ],
//  "functions": ["func1( _count)"],
//  "objects": [
//    {
//      "name": "text1",
//      "type": "Text",
//      "value": "var1"
//    }
//  ],
//  "views": [
//    {
//      "View": 0,
//      "type": "0",
//      "value": "Background(blue)",
//      "obj": "text1",
//      "location": 55
//    }
//  ],
//  "metadata": [
//    "Top Descriptor",
//    "xdc",
//    "document",
//    "test"
//  ]
//}

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


// MARK: - CIML
struct CIML: Codable {
    //var id: String = UUID().uuidString
    var contractLanguage: String?
    var description: String?
    var appVersion: String?
    var websitelink: String?
    var symbol: String?
    var name: String?
    
}
//MARK: DownloadCIMLDocument
class ManageCIMLDocument: ObservableObject {
    @Published var ciml: [CIML] = []
    
    var cancellables = Set<AnyCancellable>()
    init(){
        getCIML(url: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example-1.json")
    }
    func getCIML(url:String){
        guard let url = URL(string: url) else { return }

        URLSession.shared.dataTaskPublisher(for: url)
            .subscribe(on: DispatchQueue.global(qos: .background))
            .receive(on: DispatchQueue.main)
            .tryMap{ (data,response) -> JSONDecoder.Input in

                guard let response = response as? HTTPURLResponse,response.statusCode >= 200 && response.statusCode < 300 else {
                    throw URLError(.badServerResponse)
                }
                return data
            }
            .decode(type: [CIML].self, decoder: JSONDecoder())
            .sink { completion in
                if case .failure(let error) = completion {
                    print(error.localizedDescription)
                }
            } receiveValue: { [weak self] returnedCIML in
                print("Completion: \(returnedCIML)")
                self?.ciml = returnedCIML
            }
            .store(in: &cancellables)
    }
    
    func parseCIML(ciml:[CIML]){}
    func openCIML(address:String){
        print("you opend: \(address) DApplet")
    }
    func deleteCIML(address:String){
        print("you deleted: \(address) DApplet")
    }
}

//MARK: Object ViewModels
struct Variable_Model {
    let id: String = UUID().uuidString
    let varName:String
    let type:String
    var value:String
}
struct Function_Model:Identifiable {
    let id: String = UUID().uuidString
    let funcName:String
    let type:String
    var inputValue:[String]
    var outputValue:[String]
}
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
struct CIMLSYSImage: Identifiable {
    let id: String = UUID().uuidString
    var name:String
    var frame:[CGFloat] = [50]
    var padding:CGFloat = 20
    var color:Color = .black
    var location:Int
  
}
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
}

struct CIML_Parser: Identifiable {
    let id: String = UUID().uuidString
    var backgroundColor:Color
    var Object: any Identifiable
}


