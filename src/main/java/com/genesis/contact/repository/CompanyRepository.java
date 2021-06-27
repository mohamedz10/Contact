package com.genesis.contact.repository;

import com.genesis.contact.model.Company;
import com.genesis.contact.model.Contact;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import javax.transaction.Transactional;

@Repository
public class CompanyRepository extends ContactDao<Company>{

    private final ContactRepository contactRepository;

    @Autowired
    public CompanyRepository(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
    }

    @Transactional
    public Company addContract(Long companyId, Long contactId){
        Company company = this.get(companyId);
        Contact contactToAdd = contactRepository.get(contactId);
        if(contactToAdd != null) {
            company.getContacts().add(contactToAdd);
            this.save(company);
        }
        return company;
    }
}
