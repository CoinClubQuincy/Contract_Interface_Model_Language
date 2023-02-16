//
//  CIML_CoreData.swift
//  ContractInterface
//
//  Created by Quincy Jones on 2/14/23.
//

import Foundation
import CoreData


class CoreDataManager{
    
    let persistantContainer: NSPersistentContainer
        
    static let shared = CoreDataManager()
    
    private init(){
        
        persistantContainer = NSPersistentContainer(name: "CIMLDocuments")
        persistantContainer.loadPersistentStores { (description, error ) in
            if let error = error {
                fatalError("Failed to initialize CoreData \(error)")
            }
        }
    }
    func getAllDApps()-> [ContractDoc]{
        let fetchRequest: NSFetchRequest<ContractDoc> = ContractDoc.fetchRequest()
        do {
            return try persistantContainer.viewContext.fetch(fetchRequest)
        } catch {
            return []
        }
    }
    
    func save(){
        do{
            try persistantContainer.viewContext.save()
        } catch {
            print("Faild to save Movie \(error)")
        }
    }
}
