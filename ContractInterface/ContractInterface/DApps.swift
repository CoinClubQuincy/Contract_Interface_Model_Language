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
    
    let data = Array(1...10).map { "DApp \($0)" }
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
                        trailing:
                            NavigationLink(
                                destination: Text("Favorites")
                                .navigationTitle("Favorites")
                                ,label: {
                                    Image(systemName: "qrcode")
                                        .resizable()
                                        .scaledToFit()
                                        .foregroundColor(.black)
                                        .padding(.trailing,10)

                                })
                    )
                VStack {
                    HStack {
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
                                    VStack {
                                        Image("echo")
                                            .resizable()
                                            .scaledToFit()
                                            .frame(width: 60, height: 60)
                                            .cornerRadius(10)
                                            .shadow(radius: 10)
                                            .padding(5)
//                                            .onTapGesture(count: 1) {
//                                                print("ontap")
//                                            }
                                        Text(item)
                                            .font(.footnote)
                                    }
                                    .overlay(
                                        Circle()
                                            .fill(Color.red)
                                            .frame(width: 20,height: 20)
                                            .overlay(
                                                Text("2")
                                                    .font(.footnote)
                                                    .foregroundColor(.white)
                                            )
                                        , alignment: .topLeading
                                    )
//                                    .overlay(// check isverifired == true
//                                        Circle()
//                                            .fill(Color.green)
//                                            .frame(width: 20,height: 20)
//                                            .overlay(
//                                                Image(systemName: "checkmark.shield.fill")
//                                                    .font(.footnote)
//                                                    .foregroundColor(.white)
//                                            )
//                                        , alignment: .topTrailing
//                                    )

                            }
                        }
                        .padding(.top)
                    }
                    
                    
                    
                    /*
                    HStack {
                        VStack {
                            Button(action: {}, label: {
                                Image("storeLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(10)
                                    .shadow(radius: 10)
                                    .padding(5)
                            })
                            Text("DApp Store")
                                .font(.footnote)
                        }
                        VStack {
                            Button(action: {}, label: {
                                Image("storeLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(10)
                                    .shadow(radius: 10)
                                    .padding(5)
                            })
                            Text("DApp Store")
                                .font(.footnote)
                        }
                        
                        VStack {
                            Button(action: {}, label: {
                                Image("storeLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(10)
                                    .shadow(radius: 10)
                                    .padding(5)
                            })
                            Text("DApp Store")
                                .font(.footnote)
                        }
                        
                        VStack {
                            Button(action: {}, label: {
                                Image("storeLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(10)
                                    .shadow(radius: 10)
                                    .padding(5)
                            })
                            Text("DApp Store")
                                .font(.footnote)
                        }
                        
                        VStack {
                            Button(action: {}, label: {
                                Image("storeLogo")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 60, height: 60)
                                    .cornerRadius(10)
                                    .shadow(radius: 10)
                                    .padding(5)
                            })
                            Text("DApp Store")
                                .font(.footnote)
                        }
                        
                        
                        Spacer()
                    }
                    .padding()
                    */
                    Spacer()
                }
                .padding(.top)
                .padding(.horizontal)
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
        let id: String = UUID().uuidString
        let cimlVersion, appVersion, contractLanguage, name: String?
        let symbol, logo, thumbnail, description: String?
        let contractOrigin: String?
        let screenShots, variables, functions, objects: [String]?
        let views, metadata: [String]?
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
            .sink { (completion) in
                print("Completion: \(completion)")
            } receiveValue: { [weak self] (returnedCIML) in
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






