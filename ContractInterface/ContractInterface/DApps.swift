//
//  DApps.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/16/22.
//

import SwiftUI

//
//  DAppStore.swift
//  CoinClubCrypto
//
//  Created by Quincy Jones on 10/28/22.
//

import SwiftUI

struct DApps: View {
    @Binding var backgroundColor:LinearGradient
    @State var searchBar:String = ""
    @StateObject var vm = DownloadCIMLDocument.init()
    @State var overlayinfo:Bool = false
    @State var showDAppSettings:Bool = false
    
    let data = Array(0...0).map { "DApp \($0)" }
    let layout = [
        GridItem(.adaptive(minimum: 80))
    ]
    
    var body: some View {
        
        NavigationView {
            ZStack {
                backgroundColor
                    .ignoresSafeArea(.all)
                    .navigationTitle("DApps")
                    .navigationBarItems(
                        leading:
                            NavigationLink(
                                destination: Text("Favorites")
                                .navigationTitle("Favorites")
                                ,label: {
                                    Image(systemName: "qrcode")
                                        .resizable()
                                        .scaledToFit()
                                        .foregroundColor(.black)
                                        .padding(.trailing,10)
                                }
                            )
                        ,
                        trailing:
                            NavigationLink(
                                destination: Text("Favorites")
                                .navigationTitle("Wallet")
                                ,label: {
                                    Image(systemName: "wallet.pass.fill")
                                        .resizable()
                                        .scaledToFit()
                                        .foregroundColor(.black)
                                        .padding(.trailing,10)
                                }
                            )
                    )
                VStack {
                    HStack {
//                        ForEach(vm.ciml){ciml in
//                            Text(ciml.name ?? "Error")
//                        }
                        TextField("Search...", text: $searchBar)
                            .frame(height: 50)
                            .padding(.leading)
                            .background(Color(.white))
                            .foregroundColor(.white)
                            .cornerRadius(10)
                            .padding(.leading,5)
                            .shadow(radius: 6)
                        
                        
                        Button(action: {
                            
                        }, label: {
                            Image(systemName: "magnifyingglass.circle.fill")
                                .resizable()
                                .scaledToFit()
                                .foregroundColor(.black)
                                .frame(width: 55,height: 55, alignment: .center)
                                .cornerRadius(10)
                                .padding(.trailing,10)
                        })
                    }
                    ScrollView {
                        LazyVGrid(columns: layout, spacing: 20){
                            ForEach(data, id: \.self){item in
                                    HStack {
                                        
                                        Button(action: {}, label: {
                                            VStack{
                                            Image("echo")
                                                .resizable()
                                                .scaledToFit()
                                                .frame(width: 60, height: 60)
                                                .cornerRadius(10)
                                                .shadow(radius: 10)
                                                .padding(5)
                                            Text(item)
                                                .font(.footnote)
                                                .foregroundColor(.black)
                                        }
                                        })
                                        
                                    }
                                
                                    .overlay(
                                        Circle()
                                            .fill(Color.red)
                                            .frame(width: 20,height: 20)
                                        
                                            .overlay(
                                                
                                                Button(action: {
                                                    showDAppSettings.toggle()
                                                }, label: {
                                                    Image(systemName: "info.circle")
                                                        .foregroundColor(.blue)
                                                        .background(Color.white)
                                                        .cornerRadius(50)
                                                })
                                                .sheet(isPresented: $showDAppSettings) {
                                                    SettingsPallet
                                                }
//                                                Text("2")
//                                                    .font(.footnote)
//                                                    .foregroundColor(.white)
                                            )
                                        
                                        , alignment: .topLeading
                                    )
                            }
                        }
                        .padding(.top)
                    }
                    

                    Spacer()
                }
                .padding(.top)
                .padding(.horizontal)
            }
        }
    }
    
    var SettingsPallet: some View{
        ZStack{
            List{
                Section("DApplet"){
                    HStack{
                        Circle()
                            .frame(width: 30)
                        Text("SYMBOL")
                    }
                    HStack{
                        Text("{App} Version: ")
                        Spacer()
                        Text("0.0.0")
                            .font(.title3)
                            .bold()
                    }
                    
                    Text("This is the description of the Dapp provided")
                    
                    HStack(){
                        Text("Website:")
                        Text(" https\\:DAppletSite.com")
                            .font(.headline)
                            .foregroundColor(.blue)
                    }
                    
                    HStack{
                        Text("Network:")
                        Spacer()
                        Text("XDC")
                            .font(.title3)
                            .bold()
                    }
                    HStack{
                        VStack{
                            Text("Contract:")
                            Text("Explorer")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                        Spacer()
                        Text("xdce64996f74579ed41674a26216f8ecf980494dc38")
                            .font(.body)
                            .bold()
                    }
                    HStack{
                        Text("BackgroundColor:")
                    }
                }
                Section("Contract Interface"){
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("v1.0.0")
                            .bold()
                    }
                    }
                Section("3rd Party Verification "){
                    HStack {
                        Text("CoinClubLabs")
                        Spacer()
                        HStack {
                            Image(systemName: "checkmark.seal.fill")
                                .foregroundColor(.green)
                            Image(systemName: "info.circle")
                                .foregroundColor(.blue)
                        }
                    }
                }
            }
        }
    }
}

//
//  CIMIL_Objects.swift
//  CoinClubCrypto
//
//  Created by Quincy Jones on 11/11/22.
//

import SwiftUI
import Foundation
import Combine
// This file was generated from JSON Schema using quicktype, do not modify it directly.To parse the JSON, add this file to your project and do:   let welcome = try? newJSONDecoder().decode(Welcome.self, from: jsonData)
// This file was generated from JSON Schema using quicktype, do not modify it directly.
// To parse the JSON, add this file to your project and do:
//
//   let welcome = try? newJSONDecoder().decode(Welcome.self, from: jsonData)


// MARK: - CIML
struct CIML: Codable,Identifiable {
        var id: String = UUID().uuidString
        var cimlVersion, appVersion, contractLanguage, name: String?
        var symbol, logo, thumbnail, description: String?
        var contractOrigin: String?
        var screenShots, variables, functions, objects: [String]?
        var views, metadata: [String]?
}

class DownloadCIMLDocument: ObservableObject {
    @Published var ciml: [CIML] = []
    
    var cancellables = Set<AnyCancellable>()
    init(){
        getCIML()
    }
    func getCIML(){
        guard let url = URL(string: "https://test-youtube-engine-xxxx.s3.amazonaws.com/CIML/Example.json") else { return }

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
}

struct Variable_Model:Identifiable {
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

struct CIML_Lexer: Identifiable {
    let id: String = UUID().uuidString
    var Object: AnyView
}






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
