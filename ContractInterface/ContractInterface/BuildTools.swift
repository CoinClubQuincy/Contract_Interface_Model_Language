//
//  BuildTools.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/19/22.
//

import SwiftUI


struct BuildView: View {
    @State var showObjects:Bool = false
    @State var showSettings:Bool = false
    @Binding var backgroundColor:LinearGradient
    
    var body: some View {
        ZStack{
            backgroundColor
                .ignoresSafeArea(.all  )
        VStack{
            CIMLFinalView()
            if(showObjects){
                Spacer().animation(.easeIn)
            }
            BuildTools(showObjects: $showObjects,showSettings: $showSettings)
                .padding(.bottom)
                .padding(.top)
        }
        
    }
    }
}


struct BuildTools: View {
    @Binding var showObjects:Bool
    @Binding var showSettings:Bool
    let data = Array(1...3).map { "\($0)" }
    let layout = [
        GridItem(.adaptive(minimum: 80))
    ]

    var body: some View {
        HStack{
            Button(action: {
                
            }, label: {
                Image(systemName: "trash")
                    .resizable()
                    .scaledToFit()
            })
            
            
            Spacer()
            
            Button(action: {
                
            }, label: {
                Image(systemName: "doc.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            
            Spacer()
            
            Button(action: {
                showSettings.toggle()
            }, label: {
                Image(systemName: "gear")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showSettings, content: {
                SettingsPallet
                    .presentationDetents([.fraction(0.50)])
            })


            Spacer()
            
            Button(action: {
                showObjects.toggle()
            }, label: {
                Image(systemName: "folder.fill.badge.plus")
                    .resizable()
                    .scaledToFit()
            })
            .sheet(isPresented: $showObjects, content: {
                ObjectsPallet
                    .presentationDetents([.fraction(0.50)])
            })
            
            
        }
        .frame(maxWidth: .infinity)
        .frame(height: 30)
        .padding(.horizontal,30)
    }
    
    var ObjectsPallet: some View{
            ScrollView{
                HStack(alignment: .center){
                    
                    Button(action: {
                        
                    }, label: {
                        Text("Variables")
                            .bold()
                            .foregroundColor(.black)
                            .frame(width: 100,height: 30)
                            .background(Color.blue)
                            .cornerRadius(10)
                    })
                    Button(action: {
                        
                    }, label: {
                        Text("Functions")
                            .bold()
                            .foregroundColor(.black)
                            .frame(width: 100,height: 30)
                            .background(Color.blue)
                            .cornerRadius(10)
                    })
                    Button(action: {
                        
                    }, label: {
                        Text("Objects")
                            .bold()
                            .foregroundColor(.black)
                            .frame(width: 100,height: 30)
                            .background(Color.blue)
                            .cornerRadius(10)
                    })
                }.padding(.top)
                    LazyVGrid(columns: layout){
                        ForEach(data, id: \.self){item in
                            //Objects
                    }
                }
                .padding(.top,20)
                .padding(.horizontal,20)
            }
    }
    
    var SettingsPallet: some View{
        Text("Settings")
    }
}
