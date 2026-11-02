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
    
    func GetDAppByID(id: NSManagedObjectID)-> ContractDoc?{
        do {
            return try persistantContainer.viewContext.existingObject(with: id) as? ContractDoc
        } catch {
            print(error)
            return nil
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
    
    func delete(_ Dapp: ContractDoc){
        persistantContainer.viewContext.delete(Dapp)
        
        do{
            try persistantContainer.viewContext.save()
        } catch {
            persistantContainer.viewContext.rollback()
            print("Failed to delete DApp \(error)")
        }
        
    }
    
    func save(){
        do{
            try persistantContainer.viewContext.save()
        } catch {
            print("Faild to save DApp \(error)")
        }
    }
}
