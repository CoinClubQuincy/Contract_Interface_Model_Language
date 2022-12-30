//
//  ContentView.swift
//  ContractInterface
//
//  Created by Quincy Jones on 11/28/22.
//

import SwiftUI
import CoreData

struct ContentView: View {
    @State var selectTab:Int = 1
    @State var backgroundColor:LinearGradient = LinearGradient(gradient: Gradient(colors: [Color.white, Color.white]), startPoint: .topLeading, endPoint: .bottomTrailing)
    @StateObject var networkManager = ManageCIMLDocument()
    @StateObject var contractInterface = ContractModel()
    
    var body: some View {
        TabView(selection: $selectTab){
            ContractInterface(backgroundColor: $backgroundColor, contractInterface: contractInterface)
                .tabItem{
                Image(systemName: "app.badge.checkmark.fill")
                Text("DApplets")}
                .tag(0)
            BuildView(backgroundColor: $backgroundColor, contractInterface: contractInterface)
                .tabItem{
                Image(systemName: "plus.app.fill")
                Text("Designer")}
                .tag(1)
        }
    }
}


private let itemFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.dateStyle = .short
    formatter.timeStyle = .medium
    return formatter
}()

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView(contractInterface: ContractModel())//.environment(\.managedObjectContext, PersistenceController.preview.container.viewContext)
    }
}
