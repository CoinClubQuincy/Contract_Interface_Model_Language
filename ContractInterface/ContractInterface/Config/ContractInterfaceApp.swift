//
//  ContractInterfaceApp.swift
//  ContractInterface
//
//  Created by Quincy Jones on 11/28/22.
//

import SwiftUI

@main
struct ContractInterfaceApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
