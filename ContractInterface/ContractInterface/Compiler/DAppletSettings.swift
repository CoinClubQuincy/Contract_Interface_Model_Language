//
//  DAppletSettings.swift
//  ContractInterface
//
//  Created by Quincy Jones on 12/29/22.
//

import SwiftUI

struct DAppletSettings: View {
    @State var alertTitle:String = ""
    @State var alertMessage:String = ""
    @State var presented: Bool = false
    let DevEnv:Bool
    
    var body: some View{
        VStack{
            List{
                Section("DApplet"){
                    Image("XTB")
                        .resizable()
                        .scaledToFit()
                    HStack{
                        Circle()
                            .frame(width: 30)
                        
                        Text("Name")
                        Text("-")
                        Text("SYMBOL")
                    }
//                    HStack{ // Event Listener
//                        Text("Notifications: ")
//                        Spacer()
//                        Text("X")
//                            .font(.title3)
//                            .bold()
//                    }
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
                        }
                        Spacer()
                        Text("xdce64996f74579ed41674a26216f8ecf980494dc38")
                            .font(.body)
                            .bold()
                    }
                    HStack{
                        VStack{
                            Image(systemName: "network")
                            Text("Explorer")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
                        
                        Spacer()
                        
                        VStack{
                            Image(systemName: "qrcode")
                            Text("CI Schema")
                                .font(.footnote)
                                .foregroundColor(.blue)
                        }
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
            .listStyle(.grouped)
            AlterType
        }
    }
    
    var AlterType: some View{
        Button(action: {
            if(DevEnv){
                buttonAlert(title: "Edit DApplet", msg: "Are you sure you want to Edit this Dapplet?")
            } else{
                buttonAlert(title: "Delete DApplet", msg: "Are you sure you want to Delete this Dapplet?")
            }
        }, label: {
            Text(DevEnv ? "Edit":"Delete")
                .cornerRadius(20)
                .frame(maxWidth: .infinity)
                .foregroundColor(.black)
                .padding()
        })
        .background(DevEnv ? Color.green:Color.red)
        .alert(isPresented: $presented, content: {
            getAlert()
        })

    }
    
    func getAlert() -> Alert{
        return Alert(title: Text(alertTitle),
                     message: Text(alertMessage),
                     primaryButton: .destructive(Text("Delete")) {
                         print("Deleting...")
                     },
                     secondaryButton: .cancel())
    }
    
    func buttonAlert(title:String, msg:String){
        alertTitle = title
        alertMessage = msg
        presented.toggle()
    }
}

struct DAppletSettings_Previews: PreviewProvider {
    static var previews: some View {
        DAppletSettings(DevEnv: true)
    }
}
