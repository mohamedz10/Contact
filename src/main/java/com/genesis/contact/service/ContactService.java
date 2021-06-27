package com.genesis.contact.service;

import com.genesis.contact.model.Contact;
import com.genesis.contact.repository.ContactRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ContactService {

    private final ContactRepository contactRepository;

    @Autowired
    public ContactService(ContactRepository contactRepository) {
        this.contactRepository = contactRepository;
        this.contactRepository.setClazz(Contact.class);
    }

    public Contact getContact(Long id) {
        return contactRepository.get(id);
    }

    public Contact saveContact(Contact contact) {
        return contactRepository.save(contact);
    }

    public boolean deleteContact(Long id) {
        try {
            contactRepository.deleteById(id);
            return true;
        }catch (Exception e){
            return false;
        }
    }

    public Contact updateContact(Contact contact) {
        return contactRepository.update(contact);
    }

}
