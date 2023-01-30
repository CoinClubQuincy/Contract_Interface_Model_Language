//
//  LandingPage.swift
//  ContractInterface
//
//  Created by Quincy Jones on 1/24/23.
//

import SwiftUI

struct LandingPage: View {
    
    @StateObject var ciml = ContractModel()
    @Binding var showDapplet:Bool
    @State var downloadable:Bool = false

    var body: some View {
        
        VStack {
            Image("XTB")
                .resizable()
                .cornerRadius(20)
                .scaledToFit()
                .padding()
            
            VStack {
                HStack(alignment: .top){
                    Image("echo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 60, height: 60)
                        .cornerRadius(10)
                        .shadow(radius: 10)
                        .padding(5)

                    ScrollView(.vertical){
                        VStack(alignment: .leading){
                            Text(ciml.name)
                                .font(.title)
                                .bold()
                            Text(ciml.description)
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }
                Toggle("Downloadable", isOn: $downloadable).padding()
            }
                    HStack{
                        VStack(alignment: .leading){
                            ForEach(ciml.metadata, id: \.self){ meta in
                                Text(meta)
                                    .font(.caption)
                            }
                        }
                        
                    }
            HStack(alignment: .center){
                        Button(action: {
                            showDapplet = true
                        }, label: {
                            Text("Open")
                                .foregroundColor(.black)
                                .frame(maxWidth: .infinity)
                                .frame(height: 50)
                                .background(Color.green)
                                .cornerRadius(20)
                        })
                    }.padding()

                    
        }
        }
}

