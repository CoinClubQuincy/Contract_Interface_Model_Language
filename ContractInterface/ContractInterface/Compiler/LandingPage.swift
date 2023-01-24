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

    var body: some View {
        
        VStack {
            Image("XTB")
                .resizable()
                .cornerRadius(20)
                .scaledToFit()
                .padding()
            
            ZStack {
//                RoundedRectangle(cornerRadius: 20)
//                    .frame(maxWidth: .infinity)
//                    .frame(height: 60)
//                    .shadow(radius: 50)
                VStack{
                    Image("echo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 60, height: 60)
                        .cornerRadius(10)
                        .shadow(radius: 10)
                        .padding(5)
                    Text(ciml.name)
                        .font(.caption)
                }
                .frame(maxWidth: .infinity)
            }
                    HStack{
                        VStack(alignment: .leading){
                            ForEach(ciml.metadata, id: \.self){ meta in
                                Text(meta)
                            }
                        }
                        
                    }
                    HStack{
                        Text(ciml.description)
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

